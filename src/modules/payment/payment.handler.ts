import type { FastifyInstance } from "fastify";
import type { PaymentService } from "./payment.service.js";
import type { PaymentWebhookService } from "./payment-webhook.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";

/**
 * POST /api/v1/payments
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
    const idem = request.headers["idempotency-key"];
    const key = typeof idem === "string" ? idem : "";
    const body = request.body as { order_id?: string };
    const data = await paymentService.createOrReturnPayment(userId, key, {
      order_id: body.order_id ?? "",
    });
    return reply.code(201).send({ data, meta: { request_id: request.id } });
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
    );
    return reply.send({ data, meta: { request_id: request.id } });
  });
}
