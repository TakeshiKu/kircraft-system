import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

/**
 * GET /api/v1/orders — компактный список заказов владельца (read-only).
 */

/** Строка результата единого SELECT в репозитории. */
export type OrderListItemSnapshot = {
  orderId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  totalPriceMinor: number;
  totalQuantity: number;
  /** internal_status последней записи payments по order_id, иначе null. */
  paymentStatus: string | null;
};

export type OrderListItemDto = {
  order_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_price: number;
  total_quantity: number;
  payment_status: string | null;
};

export function mapOrderListSnapshotToDto(s: OrderListItemSnapshot): OrderListItemDto {
  return {
    order_id: s.orderId,
    status: s.status,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
    total_price: s.totalPriceMinor,
    total_quantity: s.totalQuantity,
    payment_status: s.paymentStatus,
  };
}

/** Лимиты пагинации списка заказов. */
export const ORDER_LIST_DEFAULT_LIMIT = 20;
export const ORDER_LIST_MAX_LIMIT = 50;
export const ORDER_LIST_DEFAULT_OFFSET = 0;

function queryParamFirst(
  q: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = q[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

/**
 * limit: целое > 0, по умолчанию 20, макс 50.
 * offset: целое ≥ 0, по умолчанию 0.
 */
export function parseOrderListPagination(
  query: Record<string, string | string[] | undefined>,
): { limit: number; offset: number } {
  const limitRaw = queryParamFirst(query, "limit");
  let limit = ORDER_LIST_DEFAULT_LIMIT;
  if (limitRaw !== undefined && limitRaw.trim() !== "") {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n <= 0 || n > ORDER_LIST_MAX_LIMIT) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Invalid limit",
        { field: "limit", reason: "integer_1_to_max", max: ORDER_LIST_MAX_LIMIT },
      );
    }
    limit = n;
  }

  const offsetRaw = queryParamFirst(query, "offset");
  let offset = ORDER_LIST_DEFAULT_OFFSET;
  if (offsetRaw !== undefined && offsetRaw.trim() !== "") {
    const n = Number(offsetRaw);
    if (!Number.isInteger(n) || n < 0) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        400,
        "Invalid offset",
        { field: "offset", reason: "integer_gte_0" },
      );
    }
    offset = n;
  }

  return { limit, offset };
}
