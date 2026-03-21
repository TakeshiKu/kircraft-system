import type { FastifyInstance } from "fastify";
import type { DeliveryService } from "./delivery.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";

/**
 * POST /api/v1/delivery/calculate
 * POST /api/v1/delivery/select
 * GET  /api/v1/delivery/current
 */
export function registerDeliveryRoutes(
  app: FastifyInstance,
  deliveryService: DeliveryService,
): void {
  const p = "/api/v1/delivery";

  app.post(`${p}/calculate`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = request.body as { city?: string };
    const data = await deliveryService.calculate(userId, { city: body.city ?? "" });
    return reply.send({ data, meta: { request_id: request.id } });
  });

  app.post(`${p}/select`, async (_request, _reply) => {
    throw new Error("Not implemented");
  });

  app.get(`${p}/current`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const selected = await deliveryService.current(userId);
    return reply.send({
      data: selected,
      meta: { request_id: request.id },
    });
  });
}
