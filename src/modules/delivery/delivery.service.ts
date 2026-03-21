import type { Pool } from "pg";
import type { CartRepository } from "../cart/cart.repository.js";
import type { CheckoutDeliveryRepository } from "./delivery.repository.js";
import type { SelectedDelivery } from "./delivery.domain.js";
import type { CdekService } from "../../integrations/cdek/cdek.service.js";
import type { CalculateBodyDto, SelectBodyDto } from "./delivery.dto.js";
import type { DeliveryOption } from "./delivery.domain.js";

/**
 * Расчёт и выбор ПВЗ до заказа.
 * Зависимости: корзина (активная), CdekService (не client), checkout state в БД.
 */
export class DeliveryService {
  constructor(
    private readonly pool: Pool,
    private readonly carts: CartRepository,
    private readonly checkoutDelivery: CheckoutDeliveryRepository,
    private readonly cdek: CdekService,
  ) {}

  /** POST /delivery/calculate */
  async calculate(
    customerId: string,
    body: CalculateBodyDto,
  ): Promise<{
    delivery_provider: string;
    delivery_type: string;
    city: string;
    options: unknown[];
  }> {
    const cart = await this.carts.findActiveCartByCustomerId(this.pool, customerId);
    if (!cart) {
      throw new Error("No active cart");
    }
    const shipment = await this.buildShipmentParamsFromCart(cart.cartId);
    const raw = await this.cdek.listPickupOptions({
      city: body.city,
      shipmentParamsFromCart: shipment,
    });
    const options: DeliveryOption[] = raw.map((o) => ({
      pickupPointId: o.pickupPointId,
      pickupPointName: o.pickupPointName,
      pickupPointAddress: o.pickupPointAddress,
      deliveryEtaMinDays: o.deliveryEtaMinDays,
      deliveryEtaMaxDays: o.deliveryEtaMaxDays,
      deliveryPriceMinor: o.deliveryPriceMinor,
      deliveryCurrency: o.deliveryCurrency,
    }));
    await this.checkoutDelivery.saveAfterCalculate(this.pool, customerId, cart.cartId, {
      city: body.city,
      deliveryProvider: "cdek",
      deliveryType: "pickup_point",
      options,
    });
    return {
      delivery_provider: "cdek",
      delivery_type: "pickup_point",
      city: body.city,
      options,
    };
  }

  /** POST /delivery/select */
  async select(customerId: string, body: SelectBodyDto): Promise<SelectedDelivery> {
    void body;
    void customerId;
    throw new Error("Not implemented");
  }

  /** GET /delivery/current */
  async current(customerId: string): Promise<SelectedDelivery | null> {
    const cart = await this.carts.findActiveCartByCustomerId(this.pool, customerId);
    if (!cart) return null;
    const row = await this.checkoutDelivery.load(this.pool, customerId, cart.cartId);
    return row?.selected ?? null;
  }

  private async buildShipmentParamsFromCart(_cartId: string): Promise<Record<string, unknown>> {
    return {};
  }
}
