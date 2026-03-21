import type { Pool, PoolClient } from "pg";
import type { Order, OrderItem } from "./order.domain.js";
import type { OrderDeliverySnapshot } from "./order.domain.js";
import type { OrderStatus } from "./order-state-machine.js";

/** Минимальные поля заказа: владелец, статус, сумма (мин. единицы) */
export type OrderRowForDelivery = {
  customerId: string;
  status: string;
  totalPrice: number;
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

  listForCustomer(
    client: Pool | PoolClient,
    customerId: string,
    limit: number,
    offset: number,
    status?: OrderStatus,
  ): Promise<Order[]>;

  updateStatus(
    client: Pool | PoolClient,
    orderId: string,
    customerId: string,
    newStatus: OrderStatus,
  ): Promise<Order | null>;

  findByOrderId(
    client: Pool | PoolClient,
    orderId: string,
  ): Promise<OrderRowForDelivery | null>;

  /**
   * Обновляет выбранную доставку на заказе. Возвращает число затронутых строк.
   */
  updateDelivery(
    client: Pool | PoolClient,
    orderId: string,
    data: OrderDeliveryUpdatePayload,
  ): Promise<number>;
}
