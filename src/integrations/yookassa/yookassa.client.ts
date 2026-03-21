import type { Logger } from "../../shared/logger/logger.js";
import type { AppConfig } from "../../shared/config/env.js";

/**
 * HTTP-клиент YooKassa API v3 (создание платежа, получение статуса).
 */
export class YooKassaHttpClient {
  constructor(
    private readonly config: AppConfig["yookassa"],
    private readonly log: Logger,
  ) {}

  async createPayment(_body: Record<string, unknown>): Promise<unknown> {
    this.log.debug("YooKassaHttpClient.createPayment (stub)");
    void this.config;
    throw new Error("Not implemented");
  }

  async getPayment(_externalId: string): Promise<unknown> {
    throw new Error("Not implemented");
  }
}
