import type { Payment } from "./payment.domain.js";

/** См. docs/api/modules/payment-api.md */
export type CreatePaymentBodyDto = { order_id: string };

/**
 * Единый payment detail для POST /payments и GET /payments/{payment_id}.
 * Поле `status` — канонический internal_status (БД), без дублирования internal_status.
 * Даты — ISO 8601 UTC (timestamptz → toISOString).
 */
export type PaymentDetailDto = {
  payment_id: string;
  payment_attempt_id: string;
  order_id: string;
  status: string;
  provider_status: string | null;
  external_payment_id: string | null;
  confirmation_url: string | null;
  amount: number;
  currency: string;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export function paymentToDetailDto(p: Payment): PaymentDetailDto {
  return {
    payment_id: p.paymentId,
    payment_attempt_id: p.paymentAttemptId,
    order_id: p.orderId,
    status: p.status,
    provider_status: p.providerStatus,
    external_payment_id: p.externalPaymentId,
    confirmation_url: p.confirmationUrl,
    amount: p.amountMinor,
    currency: p.currency,
    expires_at: p.expiresAt ? p.expiresAt.toISOString() : null,
    paid_at: p.paidAt ? p.paidAt.toISOString() : null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export type YooKassaWebhookObjectDto = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: {
      order_id?: string;
      payment_attempt_id?: string;
    };
  };
};
