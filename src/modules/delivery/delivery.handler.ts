import type { FastifyInstance } from "fastify";
import type { DeliveryService } from "./delivery.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

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
    const body = request.body as { city?: unknown };
    if (!body?.city || typeof body.city !== "string" || body.city.trim() === "") {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        400,
        "city is required",
        {},
      );
    }
    const data = await deliveryService.calculate(userId, { city: body.city.trim() });
    return reply.send({ data, meta: { request_id: request.id } });
  });

  app.post(`${p}/select`, async (_request, _reply) => {
    throw new AppError(ErrorCodes.NOT_IMPLEMENTED, 501, "Not implemented", {});
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
