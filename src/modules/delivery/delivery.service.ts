import type { Pool } from "pg";
import type { Logger } from "../../shared/logger/logger.js";
import type { CartRepository } from "../cart/cart.repository.js";
import type { CheckoutDeliveryRepository } from "./delivery.repository.js";
import type { SelectedDelivery } from "./delivery.domain.js";
import type { CdekService } from "../../integrations/cdek/cdek.service.js";
import type { CalculateBodyDto, SelectBodyDto } from "./delivery.dto.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

/** Ответ POST /delivery/calculate по docs/api/modules/delivery-api.md (snake_case). */
export type DeliveryCalculateApiOption = {
  pickup_point_id: string;
  pickup_point_name: string;
  pickup_point_address: string;
  delivery_eta_min_days: number;
  delivery_eta_max_days: number;
  delivery_price: number;
  delivery_currency: "RUB";
};

export type DeliveryCalculateApiData = {
  delivery_provider: "cdek";
  delivery_type: "pickup_point";
  city: string;
  options: DeliveryCalculateApiOption[];
};

/**
 * Расчёт и выбор ПВЗ до заказа.
 * calculate (MVP): только body + CdekService, без корзины и без сохранения в БД.
 */
export class DeliveryService {
  constructor(
    private readonly pool: Pool,
    private readonly carts: CartRepository,
    private readonly checkoutDelivery: CheckoutDeliveryRepository,
    private readonly cdek: CdekService,
    private readonly log: Logger,
  ) {}

  /** POST /delivery/calculate */
  async calculate(
    _customerId: string,
    body: CalculateBodyDto,
  ): Promise<DeliveryCalculateApiData> {
    this.log.info({ city: body.city }, "delivery.calculate input");

    let raw;
    try {
      raw = await this.cdek.listPickupOptions({
        city: body.city,
        shipmentParamsFromCart: {},
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      throw new AppError(
        ErrorCodes.DELIVERY_CALCULATION_FAILED,
        500,
        "Delivery calculation failed",
        { reason: message },
      );
    }

    const options: DeliveryCalculateApiOption[] = raw.map((o) => ({
      pickup_point_id: o.pickupPointId,
      pickup_point_name: o.pickupPointName,
      pickup_point_address: o.pickupPointAddress,
      delivery_eta_min_days: o.deliveryEtaMinDays,
      delivery_eta_max_days: o.deliveryEtaMaxDays,
      delivery_price: o.deliveryPriceMinor,
      delivery_currency: o.deliveryCurrency,
    }));

    this.log.info({ count: options.length }, "delivery.calculate options count");

    if (options.length === 0) {
      throw new AppError(
        ErrorCodes.DELIVERY_NOT_AVAILABLE,
        422,
        "No delivery options",
        {},
      );
    }

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
    throw new AppError(ErrorCodes.NOT_IMPLEMENTED, 501, "Not implemented", {});
  }

  /** GET /delivery/current */
  async current(customerId: string): Promise<SelectedDelivery | null> {
    const cart = await this.carts.findActiveCartByCustomerId(this.pool, customerId);
    if (!cart) return null;
    const row = await this.checkoutDelivery.load(this.pool, customerId, cart.cartId);
    return row?.selected ?? null;
  }
}
