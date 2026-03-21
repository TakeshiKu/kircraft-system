import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import type { PaymentRepository } from "./payment.repository.js";
import type { OrderRepository } from "../order/order.repository.js";
import { type PaymentInternalStatus } from "./payment-state-machine.js";
import { withTransaction } from "../../shared/db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import type { YooKassaWebhookObjectDto } from "./payment.dto.js";
import type { Logger } from "../../shared/logger/logger.js";
import { logPayment, PAYMENT_LOG_SCOPE } from "./payment-observability.js";

function replayFailureReason(err: unknown): string {
  if (err instanceof AppError) return err.code;
  return "unexpected_error";
}

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
    observability?: { request_id?: string },
  ): Promise<{ accepted: boolean }> {
    return this.processWebhook(rawBody, {
      headers,
      requireAuth: true,
      persistEvent: true,
      log_mode: "http",
      request_id: observability?.request_id,
    });
  }

  /**
   * Replay всех pending-событий для одного external_payment_id (после фиксации attempt в БД).
   * Идемпотентен, безопасен к повторному вызову; ошибки по отдельным событиям не прерывают пакет.
   */
  async replayPendingWebhookEventsForExternalPayment(
    externalPaymentId: string,
    opts?: { request_id?: string },
  ): Promise<void> {
    logPayment(this.log, "info", {
      scope: PAYMENT_LOG_SCOPE.REPLAY,
      event: "replay_started",
      request_id: opts?.request_id,
      external_payment_id: externalPaymentId,
      details: { source: "by_external_payment_id" },
    });

    const events = await this.payments.listPendingWebhookEventsByExternalPaymentId(
      this.pool,
      externalPaymentId,
    );

    for (const event of events) {
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.REPLAY,
        event: "replay_event_processing",
        request_id: opts?.request_id,
        external_payment_id: externalPaymentId,
        details: { provider_status: event.providerStatus },
      });
      try {
        await this.processWebhook(event.payload as YooKassaWebhookObjectDto, {
          requireAuth: false,
          persistEvent: false,
          log_mode: "replay",
          request_id: opts?.request_id,
        });
      } catch (err) {
        logPayment(
          this.log,
          "error",
          {
            scope: PAYMENT_LOG_SCOPE.REPLAY,
            event: "replay_event_failed",
            request_id: opts?.request_id,
            external_payment_id: externalPaymentId,
            reason: replayFailureReason(err),
            details: { provider_status: event.providerStatus },
          },
          err,
        );
      }
    }

    logPayment(this.log, "info", {
      scope: PAYMENT_LOG_SCOPE.REPLAY,
      event: "replay_completed",
      request_id: opts?.request_id,
      external_payment_id: externalPaymentId,
      details: { source: "by_external_payment_id", events_seen: events.length },
    });
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
    let batchesRun = 0;
    let eventsProcessed = 0;

    logPayment(this.log, "info", {
      scope: PAYMENT_LOG_SCOPE.REPLAY,
      event: "replay_started",
      details: { source: "database_sweep", limit, max_batches: maxBatches },
    });

    const finish = (): void => {
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.REPLAY,
        event: "replay_completed",
        details: {
          source: "database_sweep",
          batches_run: batchesRun,
          events_processed: eventsProcessed,
        },
      });
    };

    for (let batch = 0; batch < maxBatches; batch++) {
      const rows = await this.payments.listPendingWebhookEvents(this.pool, {
        limit,
      });
      if (rows.length === 0) {
        finish();
        return;
      }

      batchesRun += 1;
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.REPLAY,
        event: "replay_batch_started",
        details: { batch_index: batch, batch_size: rows.length },
      });

      for (const row of rows) {
        logPayment(this.log, "info", {
          scope: PAYMENT_LOG_SCOPE.REPLAY,
          event: "replay_event_processing",
          external_payment_id: row.externalPaymentId,
          details: { provider_status: row.providerStatus },
        });
        try {
          await this.processWebhook(row.payload as YooKassaWebhookObjectDto, {
            requireAuth: false,
            persistEvent: false,
            log_mode: "replay",
          });
          eventsProcessed += 1;
        } catch (err) {
          logPayment(
            this.log,
            "error",
            {
              scope: PAYMENT_LOG_SCOPE.REPLAY,
              event: "replay_event_failed",
              external_payment_id: row.externalPaymentId,
              reason: replayFailureReason(err),
              details: { provider_status: row.providerStatus },
            },
            err,
          );
        }
      }

      if (rows.length < limit) {
        finish();
        return;
      }
    }

    finish();
  }

  private async processWebhook(
    rawBody: YooKassaWebhookObjectDto,
    options: {
      headers?: Record<string, string | string[] | undefined>;
      requireAuth: boolean;
      persistEvent: boolean;
      log_mode: "http" | "replay";
      request_id?: string;
    },
  ): Promise<{ accepted: boolean }> {
    const scope =
      options.log_mode === "http" ? PAYMENT_LOG_SCOPE.WEBHOOK : PAYMENT_LOG_SCOPE.REPLAY;
    const requestId = options.request_id;

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

    if (options.log_mode === "http") {
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.WEBHOOK,
        event: "webhook_received",
        request_id: requestId,
        order_id: orderId,
        payment_attempt_id: attemptId,
        external_payment_id: externalId,
        details: { provider_status: providerStatus },
      });
    }

    // 2) auth check
    if (options.requireAuth) {
      const authHeaderRaw = options.headers?.authorization;
      const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
      if (authHeader !== this.expectedAuthorizationHeader) {
        logPayment(this.log, "warn", {
          scope: PAYMENT_LOG_SCOPE.WEBHOOK,
          event: "webhook_auth_failed",
          request_id: requestId,
          order_id: orderId,
          payment_attempt_id: attemptId,
          external_payment_id: externalId,
          reason: "invalid_basic_credentials",
        });
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
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.WEBHOOK,
        event: "webhook_saved_early",
        request_id: requestId,
        order_id: orderId,
        payment_attempt_id: attemptId,
        external_payment_id: externalId,
        details: { provider_status: providerStatus },
      });
    }

    // 4..9) dedupe-consistent transaction
    return withTransaction(this.pool, async (client) => {
      const eventState = await this.payments.lockWebhookEventForUpdate(
        client,
        externalId,
        providerStatus,
      );
      if (eventState === null) {
        if (options.log_mode === "http") {
          logPayment(this.log, "error", {
            scope: PAYMENT_LOG_SCOPE.WEBHOOK,
            event: "webhook_dedupe_row_missing",
            request_id: requestId,
            order_id: orderId,
            payment_attempt_id: attemptId,
            external_payment_id: externalId,
            reason: "dedupe_row_missing_after_persist",
            details: { provider_status: providerStatus },
          });
        }
        throw new AppError(
          ErrorCodes.INTERNAL_ERROR,
          500,
          "Webhook dedupe row missing after early storage",
          {
            reason: "webhook_dedupe_row_missing",
            external_payment_id: externalId,
            provider_status: providerStatus,
          },
        );
      }
      if (eventState.processingStatus === "processed") {
        if (options.log_mode === "http") {
          logPayment(this.log, "info", {
            scope: PAYMENT_LOG_SCOPE.WEBHOOK,
            event: "webhook_duplicate_noop",
            request_id: requestId,
            order_id: orderId,
            payment_attempt_id: attemptId,
            external_payment_id: externalId,
            details: { provider_status: providerStatus },
          });
        }
        return { accepted: true };
      }

      const payment = await this.payments.findByExternalId(client, externalId);
      if (!payment) {
        if (options.log_mode === "http") {
          logPayment(this.log, "warn", {
            scope: PAYMENT_LOG_SCOPE.WEBHOOK,
            event: "webhook_payment_not_found",
            request_id: requestId,
            order_id: orderId,
            payment_attempt_id: attemptId,
            external_payment_id: externalId,
            reason: "no_payment_row_for_external_id",
            details: { provider_status: providerStatus },
          });
        }
        throw new AppError(ErrorCodes.PAYMENT_NOT_FOUND, 404, "Payment not found", {
          reason: "no_payment_row_for_external_id",
          external_payment_id: externalId,
        });
      }

      const actual = await this.payments.getActualAttemptForOrder(client, payment.orderId);
      const isLateAttempt = actual !== null && actual.paymentAttemptId !== attemptId;

      const mapped = this.mapProviderToInternal(providerStatus);
      const effectiveInternalStatus: PaymentInternalStatus =
        isLateAttempt && mapped === "succeeded" ? "canceled" : mapped;

      if (isLateAttempt && mapped === "succeeded") {
        logPayment(this.log, "warn", {
          scope,
          event: "webhook_late_attempt",
          request_id: requestId,
          order_id: payment.orderId,
          payment_id: payment.paymentId,
          payment_attempt_id: attemptId,
          external_payment_id: externalId,
          reason: "late_succeeded_treated_as_canceled",
          details: {
            provider_status: providerStatus,
            actual_payment_attempt_id: actual?.paymentAttemptId,
          },
        });
      }

      const current = payment.status;

      if (this.isFinal(current)) {
        if (current === effectiveInternalStatus) {
          await this.payments.markWebhookProcessed(
            client,
            externalId,
            providerStatus,
          );
          if (options.log_mode === "http") {
            logPayment(this.log, "info", {
              scope: PAYMENT_LOG_SCOPE.WEBHOOK,
              event: "webhook_processed",
              request_id: requestId,
              order_id: payment.orderId,
              payment_id: payment.paymentId,
              payment_attempt_id: payment.paymentAttemptId,
              external_payment_id: externalId,
              status: current,
              details: { provider_status: providerStatus, path: "final_idempotent" },
            });
          }
          return { accepted: true };
        }
        if (options.log_mode === "http") {
          logPayment(this.log, "warn", {
            scope: PAYMENT_LOG_SCOPE.WEBHOOK,
            event: "webhook_state_conflict",
            request_id: requestId,
            order_id: payment.orderId,
            payment_id: payment.paymentId,
            payment_attempt_id: payment.paymentAttemptId,
            external_payment_id: externalId,
            reason: "immutable_final",
            details: {
              provider_status: providerStatus,
              current_status: current,
              incoming_status: effectiveInternalStatus,
            },
          });
        }
        throw new AppError(
          ErrorCodes.PAYMENT_STATE_CONFLICT,
          409,
          "Payment final state is immutable",
          { current, incoming: effectiveInternalStatus },
        );
      }

      if (this.rank(effectiveInternalStatus) < this.rank(current)) {
        if (options.log_mode === "http") {
          logPayment(this.log, "warn", {
            scope: PAYMENT_LOG_SCOPE.WEBHOOK,
            event: "webhook_state_conflict",
            request_id: requestId,
            order_id: payment.orderId,
            payment_id: payment.paymentId,
            payment_attempt_id: payment.paymentAttemptId,
            external_payment_id: externalId,
            reason: "status_downgrade_not_allowed",
            details: {
              provider_status: providerStatus,
              current_status: current,
              incoming_status: effectiveInternalStatus,
            },
          });
        }
        throw new AppError(
          ErrorCodes.PAYMENT_STATE_CONFLICT,
          409,
          "Status downgrade is not allowed",
          { current, incoming: effectiveInternalStatus },
        );
      }

      await this.payments.lockOrderPayments(client, payment.orderId);
      await this.payments.updatePaymentFromProvider(client, {
        paymentId: payment.paymentId,
        status: effectiveInternalStatus,
        providerStatus,
        paidAt: effectiveInternalStatus === "succeeded" ? new Date() : null,
        source: "webhook",
        ...(isLateAttempt && mapped === "succeeded" ? { providerPaid: false } : {}),
      });

      if (options.log_mode === "http") {
        logPayment(this.log, "info", {
          scope: PAYMENT_LOG_SCOPE.WEBHOOK,
          event: "webhook_transition_applied",
          request_id: requestId,
          order_id: payment.orderId,
          payment_id: payment.paymentId,
          payment_attempt_id: payment.paymentAttemptId,
          external_payment_id: externalId,
          status: effectiveInternalStatus,
          details: { provider_status: providerStatus },
        });
      }

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

      await this.payments.markWebhookProcessed(
        client,
        externalId,
        providerStatus,
      );

      if (options.log_mode === "http") {
        logPayment(this.log, "info", {
          scope: PAYMENT_LOG_SCOPE.WEBHOOK,
          event: "webhook_processed",
          request_id: requestId,
          order_id: payment.orderId,
          payment_id: payment.paymentId,
          payment_attempt_id: payment.paymentAttemptId,
          external_payment_id: externalId,
          status: effectiveInternalStatus,
          details: { provider_status: providerStatus, path: "transition" },
        });
      }

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
