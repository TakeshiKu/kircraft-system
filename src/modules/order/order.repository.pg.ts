import type { Pool, PoolClient } from "pg";
import type {
  OrderRepository,
  OrderDeliveryUpdatePayload,
  OrderRowForDelivery,
} from "./order.repository.js";
import type { Order, OrderItem } from "./order.domain.js";
import type { OrderDeliverySnapshot } from "./order.domain.js";
import type { OrderStatus } from "./order-state-machine.js";

export class OrderRepositoryPg implements OrderRepository {
  async createDraft(pool: Pool, customerId: string, orderId: string): Promise<void> {
    // snapshot поля временно заполняются пустыми значениями (MVP)
    // будут заполняться на этапе checkout
    await pool.query(
      `INSERT INTO orders (
        order_id,
        customer_id,
        customer_name_snapshot,
        phone_snapshot,
        status,
        city,
        items_total,
        delivery_price,
        total_price,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        orderId,
        customerId,
        "",
        "",
        "draft",
        "",
        0,
        0,
        0,
      ],
    );
  }

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

  async findByOrderId(
    client: Pool | PoolClient,
    orderId: string,
  ): Promise<OrderRowForDelivery | null> {
    const res = await client.query<{
      customer_id: string;
      status: string;
      total_price: string | number;
    }>(`SELECT customer_id, status, total_price FROM orders WHERE order_id = $1`, [
      orderId,
    ]);
    const row = res.rows[0];
    if (!row) return null;
    const totalPrice =
      typeof row.total_price === "string"
        ? Number(row.total_price)
        : Number(row.total_price);
    return {
      customerId: row.customer_id,
      status: row.status,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : 0,
    };
  }

  async updateDelivery(
    client: Pool | PoolClient,
    orderId: string,
    data: OrderDeliveryUpdatePayload,
  ): Promise<number> {
    const res = await client.query(
      `UPDATE orders SET
        delivery_provider = $2,
        delivery_type = $3,
        delivery_price = $4,
        delivery_currency = $5,
        pickup_point_id = $6,
        pickup_point_name = $7,
        pickup_point_address = $8,
        delivery_eta_min_days = $9,
        delivery_eta_max_days = $10,
        updated_at = NOW()
      WHERE order_id = $1`,
      [
        orderId,
        data.deliveryProvider,
        data.deliveryType,
        data.deliveryPrice,
        data.deliveryCurrency,
        data.pickupPointId,
        data.pickupPointName,
        data.pickupPointAddress,
        data.deliveryEtaMinDays,
        data.deliveryEtaMaxDays,
      ],
    );
    return res.rowCount ?? 0;
  }
}
