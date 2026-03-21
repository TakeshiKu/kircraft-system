import type { Pool } from "pg";
import type { PaymentRepository } from "./payment.repository.js";
import type { OrderRepository } from "../order/order.repository.js";
import {
  canApplyProviderFinalTransition,
  mapProviderToInternalOnCancel,
  mapProviderToInternalOnSuccess,
  type YooKassaPaymentStatus,
} from "./payment-state-machine.js";
import { nextStatusAfterSuccessfulPayment } from "../order/order-state-machine.js";
import type { YooKassaWebhookObjectDto } from "./payment.dto.js";

/**
 * Обработка POST /payments/webhook/yookassa.
 * — Проверка подлинности (вне этого класса / middleware).
 * — Обязательные поля: object.id, object.status, metadata.order_id, metadata.payment_attempt_id.
 * — Идемпотентность: повтор того же webhook не меняет заказ повторно; dedupe по external id + status/event.
 */
export class PaymentWebhookService {
  constructor(
    private readonly pool: Pool,
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
  ) {}

  async handleYooKassaNotification(
    rawBody: YooKassaWebhookObjectDto,
  ): Promise<{ accepted: boolean }> {
    const object = rawBody;
    const externalId = object.id;
    const status = object.status as YooKassaPaymentStatus | undefined;
    const orderId = object.metadata?.order_id;
    const attemptId = object.metadata?.payment_attempt_id;
    if (!externalId || !status || !orderId || !attemptId) {
      throw new Error("invalid_request");
    }

    const payment = await this.payments.findByExternalId(this.pool, externalId);
    if (!payment) throw new Error("payment_not_found");

    if (payment.paymentAttemptId !== attemptId) {
      /* late/stale attempt — по payment-api не менять заказ; зафиксировать инцидент */
      return { accepted: true };
    }

    const dedupe = `${externalId}:${status}`;
    if (this.payments.wasWebhookProcessed) {
      const done = await this.payments.wasWebhookProcessed(this.pool, dedupe);
      if (done) return { accepted: true };
    }

    if (!canApplyProviderFinalTransition(payment.providerStatus as YooKassaPaymentStatus | null, status)) {
      throw new Error("payment_state_conflict");
    }

    if (status === "succeeded") {
      void mapProviderToInternalOnSuccess;
      void nextStatusAfterSuccessfulPayment;
      void this.orders;
    }
    if (status === "canceled") {
      void mapProviderToInternalOnCancel;
    }

    void payment;
    throw new Error("Not implemented: transactional update payment + order");
  }
}
