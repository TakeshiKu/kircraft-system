import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { PaymentRepository } from "./payment.repository.js";
import type { OrderRepository } from "../order/order.repository.js";
import type { YooKassaService } from "../../integrations/yookassa/yookassa.service.js";
import type { CreatePaymentBodyDto } from "./payment.dto.js";
import {
  paymentToDetailDto,
  type PaymentDetailDto,
} from "./payment.dto.js";
import type { Payment } from "./payment.domain.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import type { Logger } from "../../shared/logger/logger.js";
import { withTransaction } from "../../shared/db/transaction.js";
import { mapYooKassaFailureToAppError } from "./payment-errors.js";
import { logPayment, PAYMENT_LOG_SCOPE } from "./payment-observability.js";

type PhaseAResult =
  | {
      kind: "return";
      payment: Payment;
      via: "client_idempotency" | "active_attempt_with_url";
    }
  | { kind: "fund"; payment: Payment; insertedThisRequest: boolean };

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

/**
 * Создание / возврат попытки оплаты, чтение статуса.
 * POST /api/v1/payments: create-or-return по docs/api/modules/payment-api.md и Часть X.
 */
export class PaymentService {
  constructor(
    private readonly pool: Pool,
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly yookassa: YooKassaService,
    private readonly yookassaReturnUrl: string,
    private readonly replayPendingWebhookEventsForExternalPayment: (
      externalPaymentId: string,
      opts?: { request_id?: string },
    ) => Promise<void>,
    private readonly log?: Logger,
  ) {}

  /**
   * POST /api/v1/payments — create-or-return (канонический контракт).
   */
  async createOrReturnPayment(
    customerId: string,
    idempotencyKey: string,
    body: CreatePaymentBodyDto,
    observability?: { request_id?: string },
  ): Promise<{ detail: PaymentDetailDto; httpStatus: 200 | 201 }> {
    const orderId = body.order_id;
    const requestId = observability?.request_id;

    const order = await this.orders.findByOrderId(this.pool, orderId);
    if (!order || order.customerId !== customerId) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
    }
    if (order.status !== "awaiting_payment") {
      throw new AppError(
        ErrorCodes.ORDER_NOT_PAYABLE,
        409,
        "Order is not payable in current state",
        { status: order.status },
      );
    }

    logPayment(this.log, "info", {
      scope: PAYMENT_LOG_SCOPE.POST,
      event: "create_or_return_started",
      request_id: requestId,
      order_id: orderId,
      customer_id: customerId,
    });

    const amountMinor = order.totalPrice;
    const currency = "RUB";
    const amountValue = (amountMinor / 100).toFixed(2);
    const description = `Order ${orderId}`;

    const phaseA = await this.runPhaseAOrReconcile({
      customerId,
      orderId,
      idempotencyKey,
      amountMinor,
      currency,
      request_id: requestId,
    });

    if (phaseA.kind === "return") {
      if (phaseA.via === "client_idempotency") {
        logPayment(this.log, "info", {
          scope: PAYMENT_LOG_SCOPE.POST,
          event: "idempotency_hit",
          request_id: requestId,
          order_id: orderId,
          customer_id: customerId,
          payment_id: phaseA.payment.paymentId,
          payment_attempt_id: phaseA.payment.paymentAttemptId,
          status: phaseA.payment.status,
        });
      } else {
        logPayment(this.log, "info", {
          scope: PAYMENT_LOG_SCOPE.POST,
          event: "active_attempt_returned",
          request_id: requestId,
          order_id: orderId,
          customer_id: customerId,
          payment_id: phaseA.payment.paymentId,
          payment_attempt_id: phaseA.payment.paymentAttemptId,
          status: phaseA.payment.status,
        });
      }
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.POST,
        event: "create_or_return_completed",
        request_id: requestId,
        order_id: orderId,
        customer_id: customerId,
        payment_id: phaseA.payment.paymentId,
        payment_attempt_id: phaseA.payment.paymentAttemptId,
        status: phaseA.payment.status,
        details: { http_status: 200 },
      });
      return {
        detail: paymentToDetailDto(phaseA.payment),
        httpStatus: 200,
      };
    }

    const { payment: draftRow, insertedThisRequest } = phaseA;

    if (insertedThisRequest) {
      logPayment(this.log, "info", {
        scope: PAYMENT_LOG_SCOPE.POST,
        event: "new_attempt_created",
        request_id: requestId,
        order_id: orderId,
        customer_id: customerId,
        payment_id: draftRow.paymentId,
        payment_attempt_id: draftRow.paymentAttemptId,
        status: draftRow.status,
      });
    }

    logPayment(this.log, "info", {
      scope: PAYMENT_LOG_SCOPE.POST,
      event: "provider_create_started",
      request_id: requestId,
      order_id: orderId,
      customer_id: customerId,
      payment_id: draftRow.paymentId,
      payment_attempt_id: draftRow.paymentAttemptId,
    });

    let yk: { externalId: string; confirmationUrl: string; status: string };
    try {
      yk = await this.yookassa.createRedirectPayment({
        idempotenceKey: draftRow.idempotenceKey,
        amountValue,
        currency,
        returnUrl: this.yookassaReturnUrl,
        description,
        metadata: { order_id: orderId, payment_attempt_id: draftRow.paymentAttemptId },
      });
    } catch (e) {
      logPayment(
        this.log,
        "error",
        {
          scope: PAYMENT_LOG_SCOPE.POST,
          event: "provider_create_failed",
          request_id: requestId,
          order_id: orderId,
          customer_id: customerId,
          payment_id: draftRow.paymentId,
          payment_attempt_id: draftRow.paymentAttemptId,
          reason: "yookassa_call_failed",
        },
        e,
      );
      await withTransaction(this.pool, async (client) => {
        await this.payments.lockOrderPayments(client, orderId);
        await this.payments.setPaymentAttemptError(client, {
          paymentId: draftRow.paymentId,
        });
        await this.payments.saveClientIdempotency(client, {
          id: randomUUID(),
          customerId,
          orderId,
          paymentAttemptId: draftRow.paymentAttemptId,
          idempotencyKey,
        });
      });
      throw mapYooKassaFailureToAppError(e);
    }

    await withTransaction(this.pool, async (client) => {
      await this.payments.lockOrderPayments(client, orderId);
      await this.payments.updatePaymentAfterProviderCreate(client, {
        paymentId: draftRow.paymentId,
        externalPaymentId: yk.externalId,
        providerStatus: yk.status,
        confirmationUrl: yk.confirmationUrl,
        source: "api",
      });
      await this.payments.saveClientIdempotency(client, {
        id: randomUUID(),
        customerId,
        orderId,
        paymentAttemptId: draftRow.paymentAttemptId,
        idempotencyKey,
      });
    });

    const fresh = await this.payments.findByIdForCustomer(
      this.pool,
      draftRow.paymentId,
      customerId,
    );
    if (!fresh) {
      logPayment(this.log, "error", {
        scope: PAYMENT_LOG_SCOPE.POST,
        event: "create_or_return_failed",
        request_id: requestId,
        order_id: orderId,
        customer_id: customerId,
        payment_id: draftRow.paymentId,
        reason: "post_commit_read_failed",
      });
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        500,
        "Payment row missing after create",
        { reason: "post_commit_read_failed" },
      );
    }

    await this.replayPendingWebhookEventsForExternalPayment(yk.externalId, {
      request_id: requestId,
    });

    const httpStatus = insertedThisRequest ? 201 : 200;
    logPayment(this.log, "info", {
      scope: PAYMENT_LOG_SCOPE.POST,
      event: "create_or_return_completed",
      request_id: requestId,
      order_id: orderId,
      customer_id: customerId,
      payment_id: fresh.paymentId,
      payment_attempt_id: fresh.paymentAttemptId,
      external_payment_id: yk.externalId,
      status: fresh.status,
      details: { http_status: httpStatus },
    });

    return {
      detail: paymentToDetailDto(fresh),
      httpStatus,
    };
  }

  /**
   * Шаги 3–5: idempotency → active+url → иначе insert (или reconcile при гонке).
   */
  private async runPhaseAOrReconcile(ctx: {
    customerId: string;
    orderId: string;
    idempotencyKey: string;
    amountMinor: number;
    currency: string;
    request_id?: string;
  }): Promise<PhaseAResult> {
    try {
      return await this.runPhaseALocked(ctx);
    } catch (e) {
      if (!isPgUniqueViolation(e)) {
        throw e;
      }
      return await this.reconcileAfterActiveAttemptConflict(ctx);
    }
  }

  private async runPhaseALocked(ctx: {
    customerId: string;
    orderId: string;
    idempotencyKey: string;
    amountMinor: number;
    currency: string;
    request_id?: string;
  }): Promise<PhaseAResult> {
    return withTransaction(this.pool, async (client) => {
      await this.payments.lockOrderPayments(client, ctx.orderId);
      await this.payments.cancelExpiredNonFinalAttemptsForOrder(client, ctx.orderId);

      const mapped = await this.payments.findByClientIdempotency(
        client,
        ctx.customerId,
        ctx.idempotencyKey,
      );
      if (mapped) {
        if (mapped.orderId !== ctx.orderId) {
          throw new AppError(
            ErrorCodes.INVALID_REQUEST,
            400,
            "Idempotency-Key is already used for another order_id",
            {},
          );
        }
        return { kind: "return", payment: mapped, via: "client_idempotency" };
      }

      const active = await this.payments.findActiveNonFinalForOrder(
        client,
        ctx.orderId,
      );
      if (active) {
        if (active.customerId !== ctx.customerId) {
          throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
        }
        if (
          active.confirmationUrl !== null &&
          active.confirmationUrl.length > 0
        ) {
          await this.payments.saveClientIdempotency(client, {
            id: randomUUID(),
            customerId: ctx.customerId,
            orderId: ctx.orderId,
            paymentAttemptId: active.paymentAttemptId,
            idempotencyKey: ctx.idempotencyKey,
          });
          const resolved = await this.payments.findByClientIdempotency(
            client,
            ctx.customerId,
            ctx.idempotencyKey,
          );
          if (
            !resolved ||
            resolved.paymentAttemptId !== active.paymentAttemptId ||
            resolved.orderId !== ctx.orderId
          ) {
            throw new AppError(
              ErrorCodes.INTERNAL_ERROR,
              500,
              "Client idempotency mapping inconsistent",
              { reason: "idempotency_resolve_mismatch" },
            );
          }
          return {
            kind: "return",
            payment: resolved,
            via: "active_attempt_with_url",
          };
        }
        if (
          active.status === "created" ||
          (active.status === "pending" &&
            (!active.confirmationUrl || active.confirmationUrl.length === 0))
        ) {
          return {
            kind: "fund",
            payment: active,
            insertedThisRequest: false,
          };
        }
      }

      const paymentId = randomUUID();
      const paymentAttemptId = randomUUID();
      const providerIdempotenceKey = randomUUID();

      const draft: Omit<Payment, "createdAt" | "updatedAt"> = {
        paymentId,
        orderId: ctx.orderId,
        customerId: ctx.customerId,
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        status: "created",
        providerStatus: null,
        externalPaymentId: null,
        idempotenceKey: providerIdempotenceKey,
        paymentAttemptId,
        confirmationUrl: null,
        expiresAt: null,
        paidAt: null,
      };

      const inserted = await this.payments.insertPaymentAttempt(client, draft);
      return {
        kind: "fund",
        payment: inserted,
        insertedThisRequest: true,
      };
    });
  }

  /**
   * X.15: после конфликта unique (активная попытка на заказ) — re-read и read-path.
   */
  private async reconcileAfterActiveAttemptConflict(ctx: {
    customerId: string;
    orderId: string;
    idempotencyKey: string;
    amountMinor: number;
    currency: string;
    request_id?: string;
  }): Promise<PhaseAResult> {
    return withTransaction(this.pool, async (client) => {
      await this.payments.lockOrderPayments(client, ctx.orderId);
      await this.payments.cancelExpiredNonFinalAttemptsForOrder(client, ctx.orderId);

      const mapped = await this.payments.findByClientIdempotency(
        client,
        ctx.customerId,
        ctx.idempotencyKey,
      );
      if (mapped) {
        if (mapped.orderId !== ctx.orderId) {
          throw new AppError(
            ErrorCodes.INVALID_REQUEST,
            400,
            "Idempotency-Key is already used for another order_id",
            {},
          );
        }
        return { kind: "return", payment: mapped, via: "client_idempotency" };
      }

      const active = await this.payments.findActiveNonFinalForOrder(
        client,
        ctx.orderId,
      );
      if (active && active.customerId !== ctx.customerId) {
        throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
      }

      if (
        active &&
        active.confirmationUrl !== null &&
        active.confirmationUrl.length > 0
      ) {
        await this.payments.saveClientIdempotency(client, {
          id: randomUUID(),
          customerId: ctx.customerId,
          orderId: ctx.orderId,
          paymentAttemptId: active.paymentAttemptId,
          idempotencyKey: ctx.idempotencyKey,
        });
        const resolved = await this.payments.findByClientIdempotency(
          client,
          ctx.customerId,
          ctx.idempotencyKey,
        );
        if (
          !resolved ||
          resolved.paymentAttemptId !== active.paymentAttemptId ||
          resolved.orderId !== ctx.orderId
        ) {
          throw new AppError(
            ErrorCodes.INTERNAL_ERROR,
            500,
            "Client idempotency mapping inconsistent",
            { reason: "idempotency_resolve_mismatch" },
          );
        }
        return {
          kind: "return",
          payment: resolved,
          via: "active_attempt_with_url",
        };
      }

      if (
        active &&
        (active.status === "created" ||
          (active.status === "pending" &&
            (!active.confirmationUrl || active.confirmationUrl.length === 0)))
      ) {
        return {
          kind: "fund",
          payment: active,
          insertedThisRequest: false,
        };
      }

      logPayment(this.log, "warn", {
        scope: PAYMENT_LOG_SCOPE.POST,
        event: "payment_attempt_conflict",
        request_id: ctx.request_id,
        order_id: ctx.orderId,
        customer_id: ctx.customerId,
        reason: "reconcile_no_fundable_path",
      });

      throw new AppError(
        ErrorCodes.PAYMENT_ATTEMPT_CONFLICT,
        409,
        "Payment attempts for this order are in an inconsistent state",
        {},
      );
    });
  }

  /**
   * GET /api/v1/payments/{payment_id}: только чтение БД, без YooKassa / webhook / replay / побочных эффектов.
   */
  async getPayment(
    customerId: string,
    paymentId: string,
  ): Promise<PaymentDetailDto | null> {
    const row = await this.payments.findByIdForCustomer(
      this.pool,
      paymentId,
      customerId,
    );
    return row ? paymentToDetailDto(row) : null;
  }
}
