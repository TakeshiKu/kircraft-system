import Fastify from "fastify";
import type { AppConfig } from "./shared/config/env.js";
import type { Logger } from "./shared/logger/logger.js";
import { createPool } from "./shared/db/pool.js";
import { AppError } from "./shared/errors/app-error.js";
import { newRequestId } from "./shared/utils/request-id.js";
import { attachAuthContext } from "./shared/middleware/auth-context.js";

import { UserRepositoryPg, UserService } from "./modules/user/index.js";
import { ProductRepositoryPg } from "./modules/product/index.js";
import {
  CartRepositoryPg,
  CartService,
  registerCartRoutes,
} from "./modules/cart/index.js";
import {
  CheckoutDeliveryRepositoryPg,
  DeliveryService,
  registerDeliveryRoutes,
} from "./modules/delivery/index.js";
import {
  OrderRepositoryPg,
  OrderService,
  registerOrderRoutes,
} from "./modules/order/index.js";
import {
  PaymentRepositoryPg,
  PaymentService,
  PaymentWebhookService,
  registerPaymentRoutes,
} from "./modules/payment/index.js";
import {
  logPayment,
  PAYMENT_LOG_SCOPE,
} from "./modules/payment/payment-observability.js";
import { CdekService } from "./integrations/cdek/index.js";
import {
  YooKassaHttpClient,
  YooKassaService,
} from "./integrations/yookassa/index.js";

export function buildApp(config: AppConfig, log: Logger) {
  const pool = createPool(config.databaseUrl, log);
  log.info("Ensure DB migrations are applied");

  const users = new UserRepositoryPg();
  const products = new ProductRepositoryPg();
  const carts = new CartRepositoryPg();
  const checkoutDelivery = new CheckoutDeliveryRepositoryPg();
  const orders = new OrderRepositoryPg();
  const payments = new PaymentRepositoryPg();

  const userService = new UserService(pool, users);
  void userService;

  const cdekService = new CdekService(log);
  const ykClient = new YooKassaHttpClient(config.yookassa, log);
  const ykService = new YooKassaService(ykClient, log);

  const cartService = new CartService(pool, carts, products);
  const deliveryService = new DeliveryService(
    pool,
    carts,
    checkoutDelivery,
    cdekService,
    log,
  );
  const orderService = new OrderService(pool, orders, carts, checkoutDelivery, log);
  const webhookService = new PaymentWebhookService(
    pool,
    payments,
    orders,
    {
      yookassaShopId: config.yookassa.shopId,
      yookassaSecretKey: config.yookassa.secretKey,
    },
    log,
  );
  const paymentService = new PaymentService(
    pool,
    payments,
    orders,
    ykService,
    config.yookassa.returnUrl,
    async (externalPaymentId, opts) => {
      await webhookService.replayPendingWebhookEventsForExternalPayment(
        externalPaymentId,
        opts,
      );
    },
    log,
  );

  setImmediate(() => {
    void webhookService
      .replayPendingWebhooksFromDatabase({ limit: 250, maxBatches: 20 })
      .catch((err: unknown) => {
        logPayment(
          log,
          "error",
          {
            scope: PAYMENT_LOG_SCOPE.REPLAY,
            event: "replay_event_failed",
            reason: "startup_database_sweep",
          },
          err,
        );
      });
  });

  const app = Fastify({
    logger: true,
    genReqId: () => newRequestId(),
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Request-Id", request.id);
    await attachAuthContext(request, config.authDevUserId);
    log.info(
      { method: request.method, url: request.url, requestId: request.id },
      "incoming request",
    );
  });

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.httpStatus).send({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: request.id,
        },
      });
    }
    log.error({ err, requestId: request.id }, "unhandled error");
    return reply.status(500).send({
      error: {
        code: "internal_error",
        message: "Внутренняя ошибка сервера",
        details: {},
        request_id: request.id,
      },
    });
  });

  registerCartRoutes(app, cartService);
  registerDeliveryRoutes(app, deliveryService);
  registerOrderRoutes(app, orderService);
  registerPaymentRoutes(app, paymentService, webhookService);

  return { app, pool };
}
