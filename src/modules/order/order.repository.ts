import type { Pool, PoolClient } from "pg";
import type { Order, OrderItem } from "./order.domain.js";
import type { OrderDeliverySnapshot } from "./order.domain.js";
import type { OrderStatus } from "./order-state-machine.js";
import type { OrderDetailSnapshot } from "./order-detail.dto.js";
import type { OrderListItemSnapshot } from "./order-list.dto.js";

export type CancelOrderForCustomerResult =
  | { outcome: "updated"; orderId: string }
  | { outcome: "not_found" }
  | { outcome: "not_cancellable"; currentStatus: string };

/** Минимальные поля заказа: владелец, статус, сумма (мин. единицы) */
export type OrderRowForDelivery = {
  customerId: string;
  status: string;
  totalPrice: number;
};

/** Поля заказа для оплаты черновика (POST /api/v1/orders/:order_id/payments): суммы в минорных единицах. */
export type OrderSnapshotForPayment = {
  customerId: string;
  status: string;
  totalPrice: number;
  itemsTotal: number;
  deliveryPrice: number;
  deliveryProvider: string | null;
  deliveryType: string | null;
};

/** Поля доставки для UPDATE orders (значения уже провалидированы) */
export type OrderDeliveryUpdatePayload = {
  deliveryProvider: string;
  deliveryType: string;
  deliveryPrice: number;
  deliveryCurrency: string;
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  deliveryEtaMinDays: number;
  deliveryEtaMaxDays: number;
};

export interface OrderRepository {
  /**
   * Черновик заказа: `customer_id` в таблице `orders`.
   */
  createDraft(
    pool: import("pg").Pool,
    customerId: string,
    orderId: string,
  ): Promise<void>;

  insertOrderWithItemsAndDelivery(
    client: PoolClient,
    params: {
      order: Omit<Order, "orderId" | "createdAt" | "updatedAt"> & {
        orderId: string;
      };
      items: OrderItem[];
      delivery: Omit<OrderDeliverySnapshot, "orderDeliveryId"> & {
        orderDeliveryId: string;
      };
      markCartConvertedCartId: string;
    },
  ): Promise<Order>;

  findByIdForCustomer(
    client: Pool | PoolClient,
    orderId: string,
    customerId: string,
  ): Promise<Order | null>;

  /**
   * Детальный снимок заказа: основное чтение с `order_id` + `customer_id` в WHERE;
   * позиции и последняя payment-строка — по принадлежащему order_id (после успешной проверки владельца).
   */
  findOrderDetailForCustomer(
    client: Pool | PoolClient,
    orderId: string,
    customerId: string,
  ): Promise<OrderDetailSnapshot | null>;

  /**
   * Список заказов клиента: один SELECT, `created_at DESC`, limit/offset.
   * Агрегат количества позиций и последний payment — через JOIN / LATERAL (без N+1).
   */
  listForCustomer(
    client: Pool | PoolClient,
    customerId: string,
    limit: number,
    offset: number,
  ): Promise<OrderListItemSnapshot[]>;

  updateStatus(
    client: Pool | PoolClient,
    orderId: string,
    customerId: string,
    newStatus: OrderStatus,
  ): Promise<Order | null>;

  /**
   * Условный UPDATE: только владелец и статус ∈ CLIENT_CANCELLABLE_ORDER_STATUSES.
   * Без чтения заказа без фильтра по customer_id.
   */
  cancelOrderForCustomer(
    client: Pool | PoolClient,
    orderId: string,
    customerId: string,
  ): Promise<CancelOrderForCustomerResult>;

  findByOrderId(
    client: Pool | PoolClient,
    orderId: string,
  ): Promise<OrderRowForDelivery | null>;

  /**
   * Снимок заказа для расчёта суммы и проверки готовности к оплате (без побочных эффектов).
   */
  findOrderForPayment(
    client: Pool | PoolClient,
    orderId: string,
  ): Promise<OrderSnapshotForPayment | null>;

  /**
   * Обновляет выбранную доставку на заказе. Возвращает число затронутых строк.
   */
  updateDelivery(
    client: Pool | PoolClient,
    orderId: string,
    data: OrderDeliveryUpdatePayload,
  ): Promise<number>;
}
