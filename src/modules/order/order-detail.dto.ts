/**
 * GET /api/v1/orders/:order_id — read-only detail для владельца.
 * Поля только из локальной БД; snake_case в JSON.
 */

export type OrderDetailItemSnapshot = {
  orderItemId: string;
  productId: string;
  productNameSnapshot: string;
  priceSnapshotMinor: number;
  quantity: number;
};

export type OrderDetailPaymentSnapshot = {
  paymentId: string;
  paymentAttemptId: string;
  internalStatus: string;
  externalPaymentId: string | null;
  paidAt: Date | null;
};

/** Снимок из репозитория (один round-trip заказа с owner filter + дочерние выборки). */
export type OrderDetailSnapshot = {
  orderId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  itemsTotalMinor: number;
  deliveryPriceMinor: number;
  totalPriceMinor: number;
  orderPaidAt: Date | null;
  city: string;
  deliveryAddress: string | null;
  deliveryProvider: string | null;
  deliveryType: string | null;
  deliveryCurrency: string | null;
  pickupPointId: string | null;
  pickupPointName: string | null;
  pickupPointAddress: string | null;
  deliveryEtaMinDays: number | null;
  deliveryEtaMaxDays: number | null;
  items: OrderDetailItemSnapshot[];
  payment: OrderDetailPaymentSnapshot | null;
};

export type OrderDetailItemDto = {
  order_item_id: string;
  product_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type OrderDetailSummaryDto = {
  items_total: number;
  delivery_price: number;
  total_price: number;
  total_quantity: number;
  /** Снимок `orders.paid_at` (подтверждённая оплата заказа), не вычисляется. */
  paid_at: string | null;
};

export type OrderDetailPaymentDto = {
  payment_id: string;
  payment_attempt_id: string;
  status: string;
  external_payment_id: string | null;
  paid_at: string | null;
};

export type OrderDetailDeliveryDto = {
  delivery_provider: string | null;
  delivery_type: string | null;
  delivery_currency: string | null;
  delivery_price: number;
  city: string;
  delivery_address: string | null;
  pickup_point_id: string | null;
  pickup_point_name: string | null;
  pickup_point_address: string | null;
  delivery_eta_min_days: number | null;
  delivery_eta_max_days: number | null;
};

export type OrderDetailDto = {
  order_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  items: OrderDetailItemDto[];
  summary: OrderDetailSummaryDto;
  payment: OrderDetailPaymentDto | null;
  delivery: OrderDetailDeliveryDto;
};

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export function mapOrderDetailSnapshotToDto(s: OrderDetailSnapshot): OrderDetailDto {
  const items: OrderDetailItemDto[] = s.items.map((it) => {
    const unit_price = it.priceSnapshotMinor;
    const line_total = unit_price * it.quantity;
    return {
      order_item_id: it.orderItemId,
      product_id: it.productId,
      title: it.productNameSnapshot,
      quantity: it.quantity,
      unit_price,
      line_total,
    };
  });

  const total_quantity = items.reduce((acc, it) => acc + it.quantity, 0);

  return {
    order_id: s.orderId,
    status: s.status,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
    items,
    summary: {
      items_total: s.itemsTotalMinor,
      delivery_price: s.deliveryPriceMinor,
      total_price: s.totalPriceMinor,
      total_quantity,
      paid_at: toIso(s.orderPaidAt),
    },
    payment: s.payment
      ? {
          payment_id: s.payment.paymentId,
          payment_attempt_id: s.payment.paymentAttemptId,
          status: s.payment.internalStatus,
          external_payment_id: s.payment.externalPaymentId,
          paid_at: toIso(s.payment.paidAt),
        }
      : null,
    delivery: {
      delivery_provider: s.deliveryProvider,
      delivery_type: s.deliveryType,
      delivery_currency: s.deliveryCurrency,
      delivery_price: s.deliveryPriceMinor,
      city: s.city,
      delivery_address: s.deliveryAddress,
      pickup_point_id: s.pickupPointId,
      pickup_point_name: s.pickupPointName,
      pickup_point_address: s.pickupPointAddress,
      delivery_eta_min_days: s.deliveryEtaMinDays,
      delivery_eta_max_days: s.deliveryEtaMaxDays,
    },
  };
}
