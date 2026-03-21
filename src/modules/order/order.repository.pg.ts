import type { Pool, PoolClient } from "pg";
import type { OrderRepository } from "./order.repository.js";
import type { Order, OrderItem } from "./order.domain.js";
import type { OrderDeliverySnapshot } from "./order.domain.js";
import type { OrderStatus } from "./order-state-machine.js";

export class OrderRepositoryPg implements OrderRepository {
  async insertOrderWithItemsAndDelivery(
    _client: PoolClient,
    _params: {
      order: Omit<Order, "orderId" | "createdAt" | "updatedAt"> & {
        orderId: string;
      };
      items: OrderItem[];
      delivery: Omit<OrderDeliverySnapshot, "orderDeliveryId"> & {
        orderDeliveryId: string;
      };
      markCartConvertedCartId: string;
    },
  ): Promise<Order> {
    throw new Error("Not implemented");
  }

  async findByIdForCustomer(
    _c: Pool | PoolClient,
    _orderId: string,
    _customerId: string,
  ): Promise<Order | null> {
    return null;
  }

  async listForCustomer(
    _c: Pool | PoolClient,
    _customerId: string,
    _limit: number,
    _offset: number,
    _status?: OrderStatus,
  ): Promise<Order[]> {
    return [];
  }

  async updateStatus(
    _c: Pool | PoolClient,
    _orderId: string,
    _customerId: string,
    _newStatus: OrderStatus,
  ): Promise<Order | null> {
    return null;
  }
}
