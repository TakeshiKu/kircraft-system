import type { Pool, PoolClient } from "pg";
import type {
  OrderRepository,
  OrderDeliveryUpdatePayload,
  OrderRowForDelivery,
} from "./order.repository.js";
import type { Order, OrderItem } from "./order.domain.js";
import type { OrderDeliverySnapshot } from "./order.domain.js";
import type { OrderStatus } from "./order-state-machine.js";
import type {
  OrderDetailItemSnapshot,
  OrderDetailPaymentSnapshot,
  OrderDetailSnapshot,
} from "./order-detail.dto.js";

function numMinor(v: string | number): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

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
    c: Pool | PoolClient,
    orderId: string,
    customerId: string,
  ): Promise<Order | null> {
    const res = await c.query<{
      order_id: string;
      customer_id: string;
      cart_id: string | null;
      source_channel: string | null;
      status: string;
      city: string;
      items_total: string | number;
      delivery_price: string | number;
      total_price: string | number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT order_id,
              customer_id,
              cart_id,
              source_channel,
              status,
              city,
              items_total,
              delivery_price,
              total_price,
              created_at,
              updated_at
       FROM orders
       WHERE order_id = $1
         AND customer_id = $2`,
      [orderId, customerId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      orderId: row.order_id,
      customerId: row.customer_id,
      cartId: row.cart_id,
      sourceChannel: row.source_channel,
      status: row.status as Order["status"],
      city: row.city ?? "",
      itemsTotalMinor: numMinor(row.items_total),
      deliveryPriceMinor: numMinor(row.delivery_price),
      totalPriceMinor: numMinor(row.total_price),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findOrderDetailForCustomer(
    c: Pool | PoolClient,
    orderId: string,
    customerId: string,
  ): Promise<OrderDetailSnapshot | null> {
    const oRes = await c.query<{
      order_id: string;
      status: string;
      created_at: Date;
      updated_at: Date;
      items_total: string | number;
      delivery_price: string | number;
      total_price: string | number;
      paid_at: Date | null;
      city: string;
      delivery_address: string | null;
      delivery_provider: string | null;
      delivery_type: string | null;
      delivery_currency: string | null;
      pickup_point_id: string | null;
      pickup_point_name: string | null;
      pickup_point_address: string | null;
      delivery_eta_min_days: number | null;
      delivery_eta_max_days: number | null;
    }>(
      `SELECT order_id,
              status,
              created_at,
              updated_at,
              items_total,
              delivery_price,
              total_price,
              paid_at,
              city,
              delivery_address,
              delivery_provider,
              delivery_type,
              delivery_currency,
              pickup_point_id,
              pickup_point_name,
              pickup_point_address,
              delivery_eta_min_days,
              delivery_eta_max_days
       FROM orders
       WHERE order_id = $1
         AND customer_id = $2`,
      [orderId, customerId],
    );
    const o = oRes.rows[0];
    if (!o) return null;

    const [itemsRes, payRes] = await Promise.all([
      c.query<{
        order_item_id: string;
        product_id: string;
        product_name_snapshot: string;
        price_snapshot: string | number;
        quantity: number;
      }>(
        `SELECT order_item_id,
                product_id,
                product_name_snapshot,
                price_snapshot,
                quantity
         FROM order_items
         WHERE order_id = $1
         ORDER BY created_at ASC, order_item_id ASC`,
        [orderId],
      ),
      c.query<{
        payment_id: string;
        payment_attempt_id: string;
        internal_status: string;
        external_payment_id: string | null;
        paid_at: Date | null;
      }>(
        `SELECT payment_id,
                payment_attempt_id,
                internal_status,
                external_payment_id,
                paid_at
         FROM payments
         WHERE order_id = $1
         ORDER BY created_at DESC, payment_id DESC
         LIMIT 1`,
        [orderId],
      ),
    ]);

    const items: OrderDetailItemSnapshot[] = itemsRes.rows.map((r) => ({
      orderItemId: r.order_item_id,
      productId: r.product_id,
      productNameSnapshot: r.product_name_snapshot,
      priceSnapshotMinor: numMinor(r.price_snapshot),
      quantity: r.quantity,
    }));

    const prow = payRes.rows[0];
    const payment: OrderDetailPaymentSnapshot | null = prow
      ? {
          paymentId: prow.payment_id,
          paymentAttemptId: prow.payment_attempt_id,
          internalStatus: prow.internal_status,
          externalPaymentId: prow.external_payment_id,
          paidAt: prow.paid_at,
        }
      : null;

    return {
      orderId: o.order_id,
      status: o.status,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      itemsTotalMinor: numMinor(o.items_total),
      deliveryPriceMinor: numMinor(o.delivery_price),
      totalPriceMinor: numMinor(o.total_price),
      orderPaidAt: o.paid_at,
      city: o.city ?? "",
      deliveryAddress: o.delivery_address,
      deliveryProvider: o.delivery_provider,
      deliveryType: o.delivery_type,
      deliveryCurrency: o.delivery_currency,
      pickupPointId: o.pickup_point_id,
      pickupPointName: o.pickup_point_name,
      pickupPointAddress: o.pickup_point_address,
      deliveryEtaMinDays: o.delivery_eta_min_days,
      deliveryEtaMaxDays: o.delivery_eta_max_days,
      items,
      payment,
    };
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
