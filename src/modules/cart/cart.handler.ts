import type { FastifyInstance } from "fastify";
import type { CartService } from "./cart.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";

/**
 * Маппинг:
 * GET    /api/v1/cart
 * POST   /api/v1/cart/items
 * PATCH  /api/v1/cart/items/:cart_item_id
 * DELETE /api/v1/cart/items/:cart_item_id
 * DELETE /api/v1/cart/items
 */
export function registerCartRoutes(
  app: FastifyInstance,
  cartService: CartService,
): void {
  const prefix = "/api/v1";

  app.get(`${prefix}/cart`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const data = await cartService.getCart(userId);
    return reply.send({ data: data ?? null, meta: { request_id: request.id } });
  });

  app.post(`${prefix}/cart/items`, async (_request, _reply) => {
    throw new Error("Not implemented");
  });

  app.patch(`${prefix}/cart/items/:cart_item_id`, async (_request, _reply) => {
    throw new Error("Not implemented");
  });

  app.delete(`${prefix}/cart/items/:cart_item_id`, async (_request, _reply) => {
    throw new Error("Not implemented");
  });

  app.delete(`${prefix}/cart/items`, async (_request, _reply) => {
    throw new Error("Not implemented");
  });
}
