import type { Logger } from "../../shared/logger/logger.js";
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
 * Адаптер CDEK (MVP stub): без HTTP-клиента, фиксированный список опций.
 */
export class CdekService {
  constructor(private readonly log: Logger) {}

  async listPickupOptions(_input: {
    city: string;
    shipmentParamsFromCart: Record<string, unknown>;
  }): Promise<CdekDeliveryOptionNormalized[]> {
    void _input;
    this.log.debug("CdekService.listPickupOptions (stub, no HTTP)");
    return [
      {
        pickupPointId: "PVZ_1",
        pickupPointName: "ПВЗ СДЭК 1",
        pickupPointAddress: "Москва, ул. Пример, 1",
        deliveryEtaMinDays: 2,
        deliveryEtaMaxDays: 4,
        deliveryPriceMinor: 25000,
        deliveryCurrency: "RUB",
      },
      {
        pickupPointId: "PVZ_2",
        pickupPointName: "ПВЗ СДЭК 2",
        pickupPointAddress: "Москва, ул. Пример, 2",
        deliveryEtaMinDays: 3,
        deliveryEtaMaxDays: 5,
        deliveryPriceMinor: 30000,
        deliveryCurrency: "RUB",
      },
    ];
  }
}
