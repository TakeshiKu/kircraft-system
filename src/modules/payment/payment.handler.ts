import type { FastifyInstance } from "fastify";
import type { PaymentService } from "./payment.service.js";
import type { PaymentWebhookService } from "./payment-webhook.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

function readIdempotencyKey(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers["idempotency-key"];
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    const t = raw[0].trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

/**
 * POST /api/v1/payments      — create-or-return (YooKassa)
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
    const idempotencyKey = readIdempotencyKey(
      request.headers as Record<string, string | string[] | undefined>,
    );
    if (idempotencyKey === null) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Missing or empty Idempotency-Key header",
        { header: "Idempotency-Key" },
      );
    }
    const body = request.body as { order_id?: unknown };
    if (typeof body?.order_id !== "string" || body.order_id.trim().length === 0) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Invalid request body",
        { field: "order_id", reason: "required_non_empty_string" },
      );
    }
    const { detail, httpStatus } = await paymentService.createOrReturnPayment(
      userId,
      idempotencyKey,
      { order_id: body.order_id.trim() },
      { request_id: request.id },
    );
    return reply.code(httpStatus).send({
      data: detail,
      meta: { request_id: request.id },
    });
  });

  app.get(`${p}/:payment_id`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { payment_id } = request.params as { payment_id: string };
    if (typeof payment_id !== "string" || payment_id.trim().length === 0) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Invalid payment_id",
        { field: "payment_id", reason: "required_non_empty_string" },
      );
    }
    const data = await paymentService.getPayment(userId, payment_id.trim());
    if (!data) {
      throw new AppError(ErrorCodes.PAYMENT_NOT_FOUND, 404, "Payment not found", {
        reason: "not_found_or_forbidden",
      });
    }
    return reply.send({ data, meta: { request_id: request.id } });
  });

  app.post(`${p}/webhook/yookassa`, async (request, reply) => {
    const data = await webhookService.handleYooKassaNotification(
      request.body as Record<string, unknown> as import("./payment.dto.js").YooKassaWebhookObjectDto,
      request.headers as Record<string, string | string[] | undefined>,
      { request_id: request.id },
    );
    return reply.send({ data, meta: { request_id: request.id } });
  });
}
