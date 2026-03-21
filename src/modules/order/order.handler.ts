import type { FastifyInstance } from "fastify";
import type { OrderService } from "./order.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";

/**
 * POST   /api/v1/orders
 * GET    /api/v1/orders
 * GET    /api/v1/orders/:order_id
 * POST   /api/v1/orders/:order_id/cancel
 */
export function registerOrderRoutes(
  app: FastifyInstance,
  orderService: OrderService,
): void {
  const p = "/api/v1/orders";

  app.post(p, async (request, reply) => {
    const { userId } = requireAuth(request);
    const order = await orderService.createFromActiveCart(userId);
    return reply.send({ data: order, meta: { request_id: request.id } });
  });

  app.get(p, async (request, reply) => {
    const { userId } = requireAuth(request);
    const q = request.query as { limit?: string; offset?: string; status?: string };
    const data = await orderService.listOrders(userId, {
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
      status: q.status,
    });
    return reply.send({
      data,
      meta: {
        request_id: request.id,
        limit: Number(q.limit ?? 20),
        offset: Number(q.offset ?? 0),
        total: data.length,
      },
    });
  });

  app.get(`${p}/:order_id`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { order_id } = request.params as { order_id: string };
    const data = await orderService.getOrder(userId, order_id);
    return reply.send({ data, meta: { request_id: request.id } });
  });

  app.post(`${p}/:order_id/cancel`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { order_id } = request.params as { order_id: string };
    const data = await orderService.cancelOrder(userId, order_id);
    return reply.send({ data, meta: { request_id: request.id } });
  });
}
