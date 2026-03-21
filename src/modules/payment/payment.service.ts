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

type PhaseAResult =
  | { kind: "return"; payment: Payment }
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
  ): Promise<{ detail: PaymentDetailDto; httpStatus: 200 | 201 }> {
    const orderId = body.order_id;

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
    });

    if (phaseA.kind === "return") {
      return {
        detail: paymentToDetailDto(phaseA.payment),
        httpStatus: 200,
      };
    }

    const { payment: draftRow, insertedThisRequest } = phaseA;

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
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        500,
        "Payment row missing after create",
        {},
      );
    }

    try {
      await this.replayPendingWebhookEventsForExternalPayment(yk.externalId);
    } catch (err) {
      this.log?.error(
        {
          err,
          externalPaymentId: yk.externalId,
          scope: "payment_create_post_commit_replay",
        },
        "replay after create failed; payment persisted, webhooks remain pending for sweep",
      );
    }

    return {
      detail: paymentToDetailDto(fresh),
      httpStatus: insertedThisRequest ? 201 : 200,
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
  }): Promise<PhaseAResult> {
    return withTransaction(this.pool, async (client) => {
      await this.payments.lockOrderPayments(client, ctx.orderId);

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
        return { kind: "return", payment: mapped };
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
          return { kind: "return", payment: resolved };
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
  }): Promise<PhaseAResult> {
    return withTransaction(this.pool, async (client) => {
      await this.payments.lockOrderPayments(client, ctx.orderId);

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
        return { kind: "return", payment: mapped };
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
        return { kind: "return", payment: resolved };
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
