import type { Pool, PoolClient } from "pg";
import type { Order, OrderItem } from "./order.domain.js";
import type { OrderDeliverySnapshot } from "./order.domain.js";
import type { OrderStatus } from "./order-state-machine.js";

export interface OrderRepository {
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
}
