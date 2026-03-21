import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { PaymentRepository } from "./payment.repository.js";
import type { OrderRepository } from "../order/order.repository.js";
import type { YooKassaService } from "../../integrations/yookassa/yookassa.service.js";
import type { CreatePaymentBodyDto } from "./payment.dto.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import type { Logger } from "../../shared/logger/logger.js";

export type CreatePaymentResponse = {
  payment_id: string;
  confirmation_url: string;
};

/**
 * Создание / возврат попытки оплаты, чтение статуса.
 * Идемпотентность: заголовок Idempotency-Key + idempotence_key в БД.
 * Транзакция: создание строки payment + вызов YooKassa — граница в реализации (rollback при сбое провайдера).
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
   * POST /api/v1/payments — создать платеж для черновика заказа, вернуть ссылку на оплату YooKassa.
   */
  async create(userId: string, orderId: string): Promise<CreatePaymentResponse> {
    const order = await this.orders.findByOrderId(this.pool, orderId);
    if (!order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
    }
    if (order.customerId !== userId) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
    }
    if (order.status !== "draft") {
      throw new AppError(
        ErrorCodes.ORDER_INVALID_STATE,
        409,
        "Order is not in draft state",
        { status: order.status },
      );
    }

    const amountMinor = order.totalPrice;
    const currency = "RUB";
    const paymentId = randomUUID();
    const paymentAttemptId = randomUUID();
    const idempotenceKey = randomUUID();
    const amountValue = (amountMinor / 100).toFixed(2);

    let yk: { externalId: string; confirmationUrl: string; status: string };
    try {
      yk = await this.yookassa.createRedirectPayment({
        idempotenceKey,
        amountValue,
        currency,
        returnUrl: this.yookassaReturnUrl,
        description: `Order ${orderId}`,
        metadata: { order_id: orderId, payment_attempt_id: paymentAttemptId },
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Unknown error";
      throw new AppError(
        ErrorCodes.PAYMENT_CREATE_FAILED,
        500,
        "Failed to create payment with provider",
        { reason },
      );
    }

    try {
      await this.payments.createPayment(this.pool, {
        paymentId,
        orderId,
        customerId: userId,
        amountMinor,
        currency,
        status: "pending",
        providerStatus: yk.status,
        externalPaymentId: yk.externalId,
        idempotenceKey,
        paymentAttemptId,
        confirmationUrl: yk.confirmationUrl,
        returnUrl: this.yookassaReturnUrl,
        description: `Order ${orderId}`,
        confirmationType: "redirect",
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Unknown error";
      throw new AppError(
        ErrorCodes.PAYMENT_CREATE_FAILED,
        500,
        "Failed to persist payment",
        { reason },
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
      payment_id: paymentId,
      confirmation_url: yk.confirmationUrl,
    };
  }

  async createOrReturnPayment(
    customerId: string,
    idempotencyKey: string,
    body: CreatePaymentBodyDto,
  ): Promise<unknown> {
    void this.orders;
    void this.yookassa;
    void this.yookassaReturnUrl;
    void customerId;
    void idempotencyKey;
    void body;
    throw new Error("Not implemented");
  }

  async getPayment(customerId: string, paymentId: string) {
    return this.payments.findByIdForCustomer(this.pool, paymentId, customerId);
  }
}
