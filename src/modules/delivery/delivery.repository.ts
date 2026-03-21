import type { Pool, PoolClient } from "pg";
import type { DeliveryOption, SelectedDelivery } from "./delivery.domain.js";

/**
 * Персистентное состояние checkout-доставки (таблица checkout_delivery_states).
 */
export interface CheckoutDeliveryRepository {
  load(
    client: Pool | PoolClient,
    customerId: string,
    cartId: string,
  ): Promise<{
    lastCalculate: {
      city: string;
      deliveryProvider: string;
      deliveryType: string;
      options: DeliveryOption[];
    } | null;
    selected: SelectedDelivery | null;
  } | null>;

  saveAfterCalculate(
    client: Pool | PoolClient,
    customerId: string,
    cartId: string,
    payload: {
      city: string;
      deliveryProvider: string;
      deliveryType: string;
      options: DeliveryOption[];
    },
  ): Promise<void>;

  saveSelected(
    client: Pool | PoolClient,
    customerId: string,
    cartId: string,
    selected: SelectedDelivery,
  ): Promise<void>;

  clearSelected(
    client: Pool | PoolClient,
    customerId: string,
    cartId: string,
  ): Promise<void>;
}
