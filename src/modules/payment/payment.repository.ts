import type { Pool, PoolClient } from "pg";
import type { Payment } from "./payment.domain.js";

export interface PaymentRepository {
  findByIdForCustomer(
    client: Pool | PoolClient,
    paymentId: string,
    customerId: string,
  ): Promise<Payment | null>;

  findByExternalId(
    client: Pool | PoolClient,
    externalPaymentId: string,
  ): Promise<Payment | null>;

  /** Актуальная нефинальная попытка для заказа (если есть). */
  findActiveNonFinalForOrder(
    client: Pool | PoolClient,
    orderId: string,
  ): Promise<Payment | null>;

  /**
   * Идемпотентность POST /payments: по паре (order_id, idempotence_key) или ключу.
   */
  findByIdempotenceKey(
    client: Pool | PoolClient,
    idempotenceKey: string,
  ): Promise<Payment | null>;

  insertPaymentAttempt(
    client: PoolClient,
    draft: Omit<Payment, "createdAt" | "updatedAt">,
  ): Promise<Payment>;

  updatePaymentFromProvider(
    client: PoolClient,
    params: {
      paymentId: string;
      status: Payment["status"];
      providerStatus: string | null;
      paidAt: Date | null;
    },
  ): Promise<void>;

  /** Пометка обработанного webhook для дедупликации (опциональная таблица). */
  wasWebhookProcessed?(
    client: Pool | PoolClient,
    dedupeKey: string,
  ): Promise<boolean>;

  markWebhookProcessed?(
    client: PoolClient,
    dedupeKey: string,
  ): Promise<void>;
}
