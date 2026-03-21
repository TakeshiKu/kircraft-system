/**
 * Централизованные правила переходов статусов заказа.
 * @see docs/api/modules/order-api.md
 */

export type OrderStatus =
  | "draft"
  | "created"
  | "awaiting_payment"
  | "needs_clarification"
  | "paid"
  | "in_progress"
  | "shipped"
  | "cancelled"
  | "rejected";

export const ORDER_STATUS_AFTER_CREATE: OrderStatus = "awaiting_payment";

const CANCELABLE: OrderStatus[] = ["awaiting_payment", "needs_clarification"];

export function canClientCancel(status: OrderStatus): boolean {
  return CANCELABLE.includes(status);
}

export function nextStatusAfterSuccessfulPayment(
  current: OrderStatus,
): OrderStatus {
  if (current !== "awaiting_payment") {
    throw new Error(`Cannot mark paid from status ${current}`);
  }
  return "paid";
}

export function nextStatusAfterCreateCheckout(): OrderStatus {
  return ORDER_STATUS_AFTER_CREATE;
}
