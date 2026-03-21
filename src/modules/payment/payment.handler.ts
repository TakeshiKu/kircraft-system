import type { FastifyInstance } from "fastify";
import type { PaymentService } from "./payment.service.js";
import type { PaymentWebhookService } from "./payment-webhook.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

/**
 * POST /api/v1/payments      — создать платеж для заказа (YooKassa)
 * GET  /api/v1/payments/:payment_id
 * POST /api/v1/payments/webhook/yookassa  (без requireAuth — своя проверка подписи)
 */
export function registerPaymentRoutes(
  app: FastifyInstance,
  paymentService: PaymentService,
  webhookService: PaymentWebhookService,
): void {
  const p = "/api/v1/payments";

  app.post(p, async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = request.body as { order_id?: unknown };
    if (typeof body?.order_id !== "string" || body.order_id.trim().length === 0) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        "Validation failed",
        { field: "order_id", reason: "required_non_empty_string" },
      );
    }
    const data = await paymentService.create(userId, body.order_id.trim());
    return reply.code(200).send({
      data,
      meta: { request_id: request.id },
    });
  });

  app.get(`${p}/:payment_id`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { payment_id } = request.params as { payment_id: string };
    const data = await paymentService.getPayment(userId, payment_id);
    return reply.send({ data, meta: { request_id: request.id } });
  });

  app.post(`${p}/webhook/yookassa`, async (request, reply) => {
    const data = await webhookService.handleYooKassaNotification(
      request.body as Record<string, unknown> as import("./payment.dto.js").YooKassaWebhookObjectDto,
      request.headers as Record<string, string | string[] | undefined>,
    );
    return reply.send({ data, meta: { request_id: request.id } });
  });
}
