import type { MoneyMinor } from "../../shared/types/money.js";

/** Выбранная доставка (Selected Delivery) — домен, не JSON API. */
export type SelectedDelivery = {
  deliveryProvider: "cdek";
  deliveryType: "pickup_point";
  city: string;
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  deliveryEtaMinDays: number;
  deliveryEtaMaxDays: number;
  deliveryPriceMinor: MoneyMinor;
  deliveryCurrency: "RUB";
};

export type DeliveryOption = Omit<
  SelectedDelivery,
  "city" | "deliveryProvider" | "deliveryType"
> & {
  pickupPointId: string;
  pickupPointName: string;
  pickupPointAddress: string;
  deliveryEtaMinDays: number;
  deliveryEtaMaxDays: number;
  deliveryPriceMinor: MoneyMinor;
  deliveryCurrency: "RUB";
};
