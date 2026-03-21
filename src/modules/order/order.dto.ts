import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

/** Фрагменты под docs/api/modules/order-api.md */
export type CreateOrderResponseDto = Record<string, unknown>;

export type SetDeliveryOptionDto = {
  pickup_point_id: string;
  pickup_point_name: string;
  pickup_point_address: string;
  delivery_eta_min_days: number;
  delivery_eta_max_days: number;
  delivery_price: number;
  delivery_currency: string;
};

export type SetDeliveryBodyDto = {
  order_id: string;
  delivery_option: SetDeliveryOptionDto;
};

function nonEmptyString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      "Validation failed",
      { field, reason: "required_non_empty_string" },
    );
  }
  return v.trim();
}

function nonNegInt(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      "Validation failed",
      { field, reason: "required_integer_gte_0" },
    );
  }
  return v;
}

/**
 * PATCH /api/v1/order/delivery — тело запроса.
 * При ошибке — AppError(VALIDATION_ERROR, 400).
 */
export function parseSetDeliveryBody(body: unknown): SetDeliveryBodyDto {
  if (body === null || typeof body !== "object") {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      "Validation failed",
      { field: "body", reason: "expected_object" },
    );
  }
  const b = body as Record<string, unknown>;
  const order_id = nonEmptyString(b.order_id, "order_id");
  const opt = b.delivery_option;
  if (opt === null || typeof opt !== "object") {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      "Validation failed",
      { field: "delivery_option", reason: "expected_object" },
    );
  }
  const o = opt as Record<string, unknown>;
  return {
    order_id,
    delivery_option: {
      pickup_point_id: nonEmptyString(o.pickup_point_id, "pickup_point_id"),
      pickup_point_name: nonEmptyString(o.pickup_point_name, "pickup_point_name"),
      pickup_point_address: nonEmptyString(
        o.pickup_point_address,
        "pickup_point_address",
      ),
      delivery_eta_min_days: nonNegInt(o.delivery_eta_min_days, "delivery_eta_min_days"),
      delivery_eta_max_days: nonNegInt(o.delivery_eta_max_days, "delivery_eta_max_days"),
      delivery_price: nonNegInt(o.delivery_price, "delivery_price"),
      delivery_currency: nonEmptyString(o.delivery_currency, "delivery_currency"),
    },
  };
}
