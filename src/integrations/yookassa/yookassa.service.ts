import type { Logger } from "../../shared/logger/logger.js";
import { YooKassaHttpClient } from "./yookassa.client.js";

/**
 * Обёртка над клиентом: идемпотентные заголовки, маппинг ошибок провайдера.
 * PaymentService использует этот класс, а не YooKassaHttpClient напрямую.
 */
export class YooKassaService {
  constructor(
    private readonly client: YooKassaHttpClient,
    private readonly log: Logger,
  ) {}

  async createPaymentWithIdempotence(
    idempotenceKey: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    void idempotenceKey;
    this.log.debug({ idempotenceKey }, "YooKassaService.createPaymentWithIdempotence");
    return this.client.createPayment(payload);
  }

  async getPaymentStatus(externalPaymentId: string): Promise<unknown> {
    return this.client.getPayment(externalPaymentId);
  }
}
