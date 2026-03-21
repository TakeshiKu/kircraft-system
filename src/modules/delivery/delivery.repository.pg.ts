import type { Pool, PoolClient } from "pg";
import type { CheckoutDeliveryRepository } from "./delivery.repository.js";
import type { DeliveryOption, SelectedDelivery } from "./delivery.domain.js";

export class CheckoutDeliveryRepositoryPg implements CheckoutDeliveryRepository {
  async load(
    _c: Pool | PoolClient,
    _customerId: string,
    _cartId: string,
  ): Promise<{
    lastCalculate: {
      city: string;
      deliveryProvider: string;
      deliveryType: string;
      options: DeliveryOption[];
    } | null;
    selected: SelectedDelivery | null;
  } | null> {
    return null;
  }

  async saveAfterCalculate(
    _c: Pool | PoolClient,
    _customerId: string,
    _cartId: string,
    _payload: Parameters<CheckoutDeliveryRepository["saveAfterCalculate"]>[3],
  ): Promise<void> {}

  async saveSelected(
    _c: Pool | PoolClient,
    _customerId: string,
    _cartId: string,
    _selected: SelectedDelivery,
  ): Promise<void> {}

  async clearSelected(
    _c: Pool | PoolClient,
    _customerId: string,
    _cartId: string,
  ): Promise<void> {}
}
