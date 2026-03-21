import type { Logger } from "../../shared/logger/logger.js";
import { CdekHttpClient } from "./cdek.client.js";
import type { MoneyMinor } from "../../shared/types/money.js";

/** Нормализованная опция ПВЗ для DeliveryService (не DTO API). */
export type CdekDeliveryOptionNormalized = {
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  deliveryEtaMinDays: number;
  deliveryEtaMaxDays: number;
  deliveryPriceMinor: MoneyMinor;
  deliveryCurrency: "RUB";
};

/**
 * Адаптер CDEK: вызывает client, маппит ответ провайдера в структуры домена доставки.
 * Cart/Delivery сервисы зависят от этого типа, а не от HTTP-клиента напрямую.
 */
export class CdekService {
  constructor(
    private readonly client: CdekHttpClient,
    private readonly log: Logger,
  ) {}

  async listPickupOptions(input: {
    city: string;
    shipmentParamsFromCart: Record<string, unknown>;
  }): Promise<CdekDeliveryOptionNormalized[]> {
    void input;
    await this.client.fetchPickupPointsAndTariffs({
      city: input.city,
      shipment: input.shipmentParamsFromCart,
    });
    this.log.debug("CdekService.listPickupOptions (stub)");
    return [];
  }
}
