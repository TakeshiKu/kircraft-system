import type { Logger } from "../../shared/logger/logger.js";
import type { AppConfig } from "../../shared/config/env.js";

/**
 * Низкоуровневый HTTP-клиент CDEK (OAuth, тарифы, ПВЗ).
 * Без бизнес-логики.
 */
export class CdekHttpClient {
  constructor(
    private readonly config: AppConfig["cdek"],
    private readonly log: Logger,
  ) {}

  async fetchPickupPointsAndTariffs(_input: {
    city: string;
    /** Параметры отправления, выведенные из корзины */
    shipment: Record<string, unknown>;
  }): Promise<unknown> {
    this.log.debug("CdekHttpClient.fetchPickupPointsAndTariffs (stub)");
    void this.config;
    throw new Error("Not implemented");
  }
}
