import type { FastifyInstance } from "fastify";
import type { OrderService } from "./order.service.js";
import { requireAuth } from "../../shared/middleware/auth-context.js";
import { parseSetDeliveryBody } from "./order.dto.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";
import { parseOrderListPagination } from "./order-list.dto.js";

/**
 * POST   /api/v1/order  — черновик заказа
 * PATCH  /api/v1/order/delivery — выбранная доставка в черновик
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

  app.patch("/api/v1/order/delivery", async (request, reply) => {
    const { userId } = requireAuth(request);
    const body = parseSetDeliveryBody(request.body);
    const data = await orderService.setDelivery(userId, body);
    return reply.code(200).send({
      data,
      meta: { request_id: request.id },
    });
  });

  app.post("/api/v1/order", async (request, reply) => {
    const { userId } = requireAuth(request);
    const data = await orderService.createDraft(userId);
    return reply.code(201).send({
      data,
      meta: { request_id: request.id },
    });
  });

  app.post(p, async (request, reply) => {
    const { userId } = requireAuth(request);
    const order = await orderService.createFromActiveCart(userId);
    return reply.send({ data: order, meta: { request_id: request.id } });
  });

  app.get(p, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { limit, offset } = parseOrderListPagination(
      request.query as Record<string, string | string[] | undefined>,
    );
    const data = await orderService.listOrdersForCustomer(userId, limit, offset);
    return reply.send({
      data,
      meta: { request_id: request.id },
    });
  });

  app.get(`${p}/:order_id`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { order_id: rawOrderId } = request.params as { order_id: string };
    const order_id =
      typeof rawOrderId === "string" ? rawOrderId.trim() : "";
    if (order_id.length === 0) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Invalid order_id",
        { field: "order_id", reason: "required_non_empty_string" },
      );
    }
    const data = await orderService.getOrderDetail(userId, order_id);
    if (!data) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 404, "Order not found", {});
    }
    return reply.send({ data, meta: { request_id: request.id } });
  });

  app.post(`${p}/:order_id/cancel`, async (request, reply) => {
    const { userId } = requireAuth(request);
    const { order_id } = request.params as { order_id: string };
    const data = await orderService.cancelOrder(userId, order_id);
    return reply.send({ data, meta: { request_id: request.id } });
  });
}
