import type { Pool, PoolClient } from "pg";
import type { Payment } from "./payment.domain.js";

/** Данные для INSERT в `payments` после успешного ответа YooKassa */
export type CreatePaymentRow = {
  paymentId: string;
  orderId: string;
  customerId: string;
  amountMinor: number;
  currency: string;
  /** Legacy-compatible поле; канонический статус в БД — internal_status */
  status: string;
  providerStatus: string | null;
  externalPaymentId: string;
  idempotenceKey: string;
  paymentAttemptId: string;
  confirmationUrl: string;
  returnUrl: string;
  description: string;
  confirmationType: string;
};

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

  /**
   * Client-idempotency lookup: возвращает попытку, привязанную к (customer_id, idempotency_key).
   */
  findByClientIdempotency(
    client: Pool | PoolClient,
    customerId: string,
    idempotencyKey: string,
  ): Promise<Payment | null>;

  /**
   * Client-idempotency save: INSERT ... ON CONFLICT DO NOTHING + SELECT.
   * Хранит ссылку на attempt, не response snapshot.
   */
  saveClientIdempotency(
    client: Pool | PoolClient,
    params: {
      id: string;
      customerId: string;
      orderId: string;
      paymentAttemptId: string;
      idempotencyKey: string;
    },
  ): Promise<{ paymentAttemptId: string }>;

  insertPaymentAttempt(
    client: PoolClient,
    draft: Omit<Payment, "createdAt" | "updatedAt">,
  ): Promise<Payment>;

  /** Создать запись платежа (после создания платежа в YooKassa). */
  createPayment(client: Pool, data: CreatePaymentRow): Promise<void>;

  /**
   * После успешного create в YooKassa: created → pending, внешний id, ссылка, provider_status.
   */
  updatePaymentAfterProviderCreate(
    client: PoolClient,
    params: {
      paymentId: string;
      externalPaymentId: string;
      providerStatus: string;
      confirmationUrl: string;
      source?: string | null;
    },
  ): Promise<void>;

  /**
   * Ошибка провайдера при создании: попытка остаётся в БД, internal_status = error (неактивна).
   */
  setPaymentAttemptError(client: PoolClient, params: { paymentId: string }): Promise<void>;

  updatePaymentFromProvider(
    client: PoolClient,
    params: {
      paymentId: string;
      /** Канонический внутренний статус (синхронно пишется и в legacy status) */
      status: Payment["status"];
      providerStatus: string | null;
      paidAt: Date | null;
      /** Опциональный источник обновления статуса (без хардкода в repository) */
      source?: string | null;
      /**
       * Если задано, явно выставляет `provider_paid` (например false при late attempt:
       * провайдер сообщил succeeded, но бизнес-статус попытки — неуспешный финал).
       * Если не задано — прежняя логика: при provider_status = succeeded → true.
       */
      providerPaid?: boolean;
    },
  ): Promise<void>;

  /**
   * Возвращает actual attempt для order:
   * 1) активная нефинальная (created/pending + not expired)
   * 2) иначе последняя созданная.
   */
  getActualAttemptForOrder(
    client: Pool | PoolClient,
    orderId: string,
  ): Promise<Payment | null>;

  /**
   * Явная блокировка payment-строк заказа для использования в сервисной транзакции.
   */
  lockOrderPayments(
    client: PoolClient,
    orderId: string,
  ): Promise<void>;

  /** Проверка дедупликации webhook по паре (external_payment_id, provider_status). */
  wasWebhookProcessed(
    client: Pool | PoolClient,
    externalPaymentId: string,
    providerStatus: string,
  ): Promise<boolean>;

  /**
   * Блокирует строку webhook-события FOR UPDATE и возвращает текущий processing_status.
   */
  lockWebhookEventForUpdate(
    client: PoolClient,
    externalPaymentId: string,
    providerStatus: string,
  ): Promise<{ processingStatus: "pending" | "processed" | "failed" } | null>;

  markWebhookProcessed(
    client: PoolClient,
    externalPaymentId: string,
    providerStatus: string,
  ): Promise<void>;

  /**
   * Early-storage webhook event (full payload) до основной обработки.
   */
  saveWebhookEvent(
    client: Pool | PoolClient,
    params: {
      id: string;
      externalPaymentId: string;
      providerStatus: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void>;

  /**
   * Выгружает pending webhook-события для replay после появления attempt.
   */
  listPendingWebhookEventsByExternalPaymentId(
    client: Pool | PoolClient,
    externalPaymentId: string,
  ): Promise<Array<{ providerStatus: string; payload: Record<string, unknown> }>>;

  /**
   * Все pending-события из БД для планового / повторяемого replay (sweep).
   * Порядок: FIFO по времени поступления.
   */
  listPendingWebhookEvents(
    client: Pool | PoolClient,
    params: { limit: number },
  ): Promise<
    Array<{
      externalPaymentId: string;
      providerStatus: string;
      payload: Record<string, unknown>;
    }>
  >;
}
