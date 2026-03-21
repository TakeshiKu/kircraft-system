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

/**
 * Создание заказа — атомарно: order + items + order_deliveries + cart converted.
 */
export class OrderService {
  constructor(
    private readonly pool: Pool,
    private readonly orders: OrderRepository,
    private readonly carts: CartRepository,
    private readonly checkoutDelivery: CheckoutDeliveryRepository,
  ) {}

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
