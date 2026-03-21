import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { withTransaction } from "../../shared/db/transaction.js";
import type { OrderRepository } from "./order.repository.js";
import type { CartRepository } from "../cart/cart.repository.js";
import type { CheckoutDeliveryRepository } from "../delivery/delivery.repository.js";
import {
  ORDER_STATUS_AFTER_CREATE,
  canClientCancel,
  nextStatusAfterCreateCheckout,
} from "./order-state-machine.js";
import type { Order } from "./order.domain.js";
import type { SetDeliveryBodyDto } from "./order.dto.js";
import {
  mapOrderDetailSnapshotToDto,
  type OrderDetailDto,
} from "./order-detail.dto.js";
import type { Logger } from "../../shared/logger/logger.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

export type OrderDraftResponse = {
  order_id: string;
  status: "draft";
};

/**
 * Создание заказа — атомарно: order + items + order_deliveries + cart converted.
 */
export class OrderService {
  constructor(
    private readonly pool: Pool,
    private readonly orders: OrderRepository,
    private readonly carts: CartRepository,
    private readonly checkoutDelivery: CheckoutDeliveryRepository,
    private readonly log: Logger,
  ) {}

  /** POST /api/v1/order — новый черновик без проверок существующих. */
  async createDraft(userId: string): Promise<OrderDraftResponse> {
    const orderId = randomUUID();
    const customerId = userId;
    try {
      await this.orders.createDraft(this.pool, customerId, orderId);
    } catch (e) {
      const pgCode =
        e !== null && typeof e === "object" && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      // временная логика: любой FK трактуется как customer_not_found (MVP)
      // в будущем нужно различать по constraint name
      if (pgCode === "23503") {
        throw new AppError(
          ErrorCodes.CUSTOMER_NOT_FOUND,
          404,
          "Customer not found",
          {},
        );
      }
      const message = e instanceof Error ? e.message : "Unknown error";
      throw new AppError(
        ErrorCodes.ORDER_CREATE_FAILED,
        500,
        "Failed to create order draft",
        { reason: message },
      );
    }
    this.log.info({ userId, orderId }, "order draft created");
    return { order_id: orderId, status: "draft" };
  }

  /**
   * PATCH /api/v1/order/delivery — сохранить выбранную доставку в черновик заказа (без CDEK и без пересчёта).
   */
  async setDelivery(userId: string, input: SetDeliveryBodyDto): Promise<{ order_id: string }> {
    const orderId = input.order_id;
    const row = await this.orders.findByOrderId(this.pool, orderId);
    if (!row) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
    }
    if (row.customerId !== userId) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
    }
    if (row.status !== "draft") {
      throw new AppError(
        ErrorCodes.ORDER_INVALID_STATE,
        409,
        "Order is not in draft state",
        { status: row.status },
      );
    }
    const d = input.delivery_option;
    const payload = {
      deliveryProvider: "cdek",
      deliveryType: "pickup_point",
      deliveryPrice: d.delivery_price,
      deliveryCurrency: d.delivery_currency,
      pickupPointId: d.pickup_point_id,
      pickupPointName: d.pickup_point_name,
      pickupPointAddress: d.pickup_point_address,
      deliveryEtaMinDays: d.delivery_eta_min_days,
      deliveryEtaMaxDays: d.delivery_eta_max_days,
    };
    try {
      const n = await this.orders.updateDelivery(this.pool, orderId, payload);
      if (n !== 1) {
        throw new AppError(
          ErrorCodes.ORDER_UPDATE_FAILED,
          500,
          "Failed to update order delivery",
          { rows: n },
        );
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      const message = e instanceof Error ? e.message : "Unknown error";
      throw new AppError(
        ErrorCodes.ORDER_UPDATE_FAILED,
        500,
        "Failed to update order delivery",
        { reason: message },
      );
    }
    this.log.info({ userId, orderId }, "order delivery set");
    return { order_id: orderId };
  }

  async createFromActiveCart(customerId: string): Promise<Order> {
    return withTransaction(this.pool, async (client) => {
      const cart = await this.carts.findActiveCartByCustomerId(client, customerId);
      if (!cart) throw new Error("cart_not_active");
      const deliveryRow = await this.checkoutDelivery.load(
        client,
        customerId,
        cart.cartId,
      );
      if (!deliveryRow?.selected) throw new Error("delivery_not_selected");
      void ORDER_STATUS_AFTER_CREATE;
      void nextStatusAfterCreateCheckout;
      void deliveryRow;
      throw new Error("Not implemented: persist order snapshot");
    });
  }

  async getOrder(customerId: string, orderId: string) {
    return this.orders.findByIdForCustomer(this.pool, orderId, customerId);
  }

  /**
   * GET /api/v1/orders/:order_id — только чтение из БД, без побочных эффектов.
   * Владелец обязателен: фильтр в первом запросе к `orders`.
   */
  async getOrderDetail(customerId: string, orderId: string): Promise<OrderDetailDto | null> {
    const snapshot = await this.orders.findOrderDetailForCustomer(
      this.pool,
      orderId,
      customerId,
    );
    return snapshot ? mapOrderDetailSnapshotToDto(snapshot) : null;
  }

  async listOrders(
    customerId: string,
    q: { limit?: number; offset?: number; status?: string },
  ) {
    return this.orders.listForCustomer(
      this.pool,
      customerId,
      q.limit ?? 20,
      q.offset ?? 0,
      q.status as import("./order-state-machine.js").OrderStatus | undefined,
    );
  }

  async cancelOrder(customerId: string, orderId: string) {
    const order = await this.orders.findByIdForCustomer(
      this.pool,
      orderId,
      customerId,
    );
    if (!order) return null;
    if (!canClientCancel(order.status)) {
      throw new Error("order_cannot_be_cancelled");
    }
    return this.orders.updateStatus(
      this.pool,
      orderId,
      customerId,
      "cancelled",
    );
  }
}
