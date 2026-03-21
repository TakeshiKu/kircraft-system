import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import type { PaymentRepository } from "./payment.repository.js";
import type { OrderRepository } from "../order/order.repository.js";
import {
  type PaymentInternalStatus,
} from "./payment-state-machine.js";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import type { YooKassaWebhookObjectDto } from "./payment.dto.js";
import type { Logger } from "../../shared/logger/logger.js";

/**
 * Обработка POST /payments/webhook/yookassa.
 * — Проверка подлинности (вне этого класса / middleware).
 * — Обязательные поля: object.id, object.status, metadata.order_id, metadata.payment_attempt_id.
 * — Идемпотентность: повтор того же webhook не меняет заказ повторно; dedupe по external id + status/event.
 */
export class PaymentWebhookService {
  private readonly expectedAuthorizationHeader: string;

  constructor(
    private readonly pool: Pool,
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
    auth: { yookassaShopId: string; yookassaSecretKey: string },
    private readonly log?: Logger,
  ) {
    const token = Buffer.from(`${auth.yookassaShopId}:${auth.yookassaSecretKey}`).toString(
      "base64",
    );
    this.expectedAuthorizationHeader = `Basic ${token}`;
  }

  async handleYooKassaNotification(
    rawBody: YooKassaWebhookObjectDto,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<{ accepted: boolean }> {
    return this.processWebhook(rawBody, {
      headers,
      requireAuth: true,
      persistEvent: true,
    });
  }

  /**
   * Replay всех pending-событий для одного external_payment_id (после фиксации attempt в БД).
   * Идемпотентен, безопасен к повторному вызову; ошибки по отдельным событиям не прерывают пакет.
   */
  async replayPendingWebhookEventsForExternalPayment(
    externalPaymentId: string,
  ): Promise<void> {
    const events = await this.payments.listPendingWebhookEventsByExternalPaymentId(
      this.pool,
      externalPaymentId,
    );
    for (const event of events) {
      try {
        await this.processWebhook(event.payload as YooKassaWebhookObjectDto, {
          requireAuth: false,
          persistEvent: false,
        });
      } catch (err) {
        this.log?.error(
          {
            err,
            externalPaymentId,
            scope: "webhook_replay_by_external_id",
          },
          "replay pending webhook event failed; row stays pending for next sweep",
        );
      }
    }
  }

  /**
   * Плановый replay pending webhook из БД (FIFO). Обязательный контур оркестрации:
   * вызывается при старте приложения и может вызываться повторно без побочных эффектов для уже обработанных событий.
   *
   * Несколько батчей подряд: пока очередь не пуста и размер батча = limit (есть ещё записи).
   */
  async replayPendingWebhooksFromDatabase(options?: {
    limit?: number;
    maxBatches?: number;
  }): Promise<void> {
    const limit = options?.limit ?? 100;
    const maxBatches = options?.maxBatches ?? 20;
    for (let batch = 0; batch < maxBatches; batch++) {
      const rows = await this.payments.listPendingWebhookEvents(this.pool, {
        limit,
      });
      if (rows.length === 0) {
        return;
      }
      for (const row of rows) {
        try {
          await this.processWebhook(row.payload as YooKassaWebhookObjectDto, {
            requireAuth: false,
            persistEvent: false,
          });
        } catch (err) {
          this.log?.error(
            {
              err,
              externalPaymentId: row.externalPaymentId,
              providerStatus: row.providerStatus,
              scope: "webhook_replay_db_sweep",
            },
            "DB sweep replay failed; event remains pending",
          );
        }
      }
      if (rows.length < limit) {
        return;
      }
    }
  }

  private async processWebhook(
    rawBody: YooKassaWebhookObjectDto,
    options: {
      headers?: Record<string, string | string[] | undefined>;
      requireAuth: boolean;
      persistEvent: boolean;
    },
  ): Promise<{ accepted: boolean }> {
    // 1) parse + validate payload
    const object = rawBody.object;
    const externalId = object?.id;
    const providerStatus = object?.status;
    const orderId = object?.metadata?.order_id;
    const attemptId = object?.metadata?.payment_attempt_id;
    if (
      typeof externalId !== "string" ||
      externalId.length === 0 ||
      typeof providerStatus !== "string" ||
      providerStatus.length === 0 ||
      typeof orderId !== "string" ||
      orderId.length === 0 ||
      typeof attemptId !== "string" ||
      attemptId.length === 0
    ) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Invalid webhook payload",
        { reason: "missing_required_object_fields" },
      );
    }

    // 2) auth check
    if (options.requireAuth) {
      const authHeaderRaw = options.headers?.authorization;
      const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
      // Technical limitation for current integration stage:
      // webhook auth is strict Basic equality with configured shopId/secret.
      if (authHeader !== this.expectedAuthorizationHeader) {
        throw new AppError(
          ErrorCodes.UNAUTHORIZED_WEBHOOK,
          401,
          "Unauthorized webhook",
          {},
        );
      }
    }

    // 3) early storage
    if (options.persistEvent) {
      await this.payments.saveWebhookEvent(this.pool, {
        id: randomUUID(),
        externalPaymentId: externalId,
        providerStatus,
        payload: rawBody as Record<string, unknown>,
      });
    }

    // 4..9) dedupe-consistent transaction
    return withTransaction(this.pool, async (client) => {
      // 4) dedupe check (and lock) inside transaction
      const eventState = await this.payments.lockWebhookEventForUpdate(
        client,
        externalId,
        providerStatus,
      );
      if (eventState === null) {
        throw new AppError(
          ErrorCodes.INTERNAL_ERROR,
          500,
          "Webhook dedupe row missing",
          { external_payment_id: externalId, provider_status: providerStatus },
        );
      }
      if (eventState.processingStatus === "processed") {
        return { accepted: true };
      }

      // 5) find payment by external_payment_id
      const payment = await this.payments.findByExternalId(client, externalId);
      if (!payment) {
        throw new AppError(ErrorCodes.PAYMENT_NOT_FOUND, 404, "Payment not found", {});
      }

      // 6) determine actual/late attempt
      const actual = await this.payments.getActualAttemptForOrder(client, payment.orderId);
      const isLateAttempt = actual !== null && actual.paymentAttemptId !== attemptId;

      const mapped = this.mapProviderToInternal(providerStatus);
      /**
       * Late attempt (metadata.payment_attempt_id !== actual для заказа): не меняет business state
       * заказа и не считается успешной актуальной оплатой. При provider succeeded фиксируем
       * внутренний финал как canceled (контракт §4.6–4.7); provider_status остаётся фактическим.
       */
      const effectiveInternalStatus: PaymentInternalStatus =
        isLateAttempt && mapped === "succeeded" ? "canceled" : mapped;

      if (isLateAttempt && mapped === "succeeded") {
        this.log?.info(
          {
            scope: "webhook_late_attempt",
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            externalPaymentId: externalId,
            webhookPaymentAttemptId: attemptId,
            actualPaymentAttemptId: actual?.paymentAttemptId,
          },
          "Late attempt: provider succeeded → internal canceled; order not updated",
        );
      }

      const current = payment.status;

      // 7) apply transition rules (including downgrade/final immutability)
      if (this.isFinal(current)) {
        if (current === effectiveInternalStatus) {
          await this.payments.markWebhookProcessed(
            client,
            externalId,
            providerStatus,
          );
          return { accepted: true };
        }
        throw new AppError(
          ErrorCodes.PAYMENT_STATE_CONFLICT,
          409,
          "Payment final state is immutable",
          { current, incoming: effectiveInternalStatus },
        );
      }

      if (this.rank(effectiveInternalStatus) < this.rank(current)) {
        throw new AppError(
          ErrorCodes.PAYMENT_STATE_CONFLICT,
          409,
          "Status downgrade is not allowed",
          { current, incoming: effectiveInternalStatus },
        );
      }

      // 8) transactional update payment + order
      await this.payments.lockOrderPayments(client, payment.orderId);
      await this.payments.updatePaymentFromProvider(client, {
        paymentId: payment.paymentId,
        status: effectiveInternalStatus,
        providerStatus,
        paidAt: effectiveInternalStatus === "succeeded" ? new Date() : null,
        source: "webhook",
        ...(isLateAttempt && mapped === "succeeded"
          ? { providerPaid: false }
          : {}),
      });

      if (!isLateAttempt && effectiveInternalStatus === "succeeded") {
        await client.query(
          `UPDATE orders
           SET status = 'paid',
               paid_at = NOW(),
               updated_at = NOW()
           WHERE order_id = $1
             AND status = 'awaiting_payment'`,
          [payment.orderId],
        );
      }

      // 9) mark processed
      await this.payments.markWebhookProcessed(
        client,
        externalId,
        providerStatus,
      );

      // 10) response
      return { accepted: true };
    });
  }

  private mapProviderToInternal(providerStatus: string): PaymentInternalStatus {
    if (providerStatus === "pending") return "pending";
    if (providerStatus === "waiting_for_capture") return "pending";
    if (providerStatus === "succeeded") return "succeeded";
    if (providerStatus === "canceled") return "canceled";
    return "error";
  }

  private isFinal(s: PaymentInternalStatus): boolean {
    return s === "succeeded" || s === "canceled" || s === "error";
  }

  private rank(s: PaymentInternalStatus): number {
    if (s === "created") return 0;
    if (s === "pending") return 1;
    if (s === "succeeded") return 2;
    if (s === "canceled") return 2;
    return 3; // error
  }
}
