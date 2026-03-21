/**
 * Внутренний статус попытки оплаты и согласование с provider_status.
 * @see docs/api/modules/payment-api.md §4.4, §7.4
 */

export type PaymentInternalStatus =
  | "created"
  | "pending"
  | "succeeded"
  | "canceled"
  | "error";

export type YooKassaPaymentStatus =
  | "pending"
  | "waiting_for_capture"
  | "succeeded"
  | "canceled";

/** Нефинальные статусы провайдера, из которых допустим переход к финальным. */
const NON_FINAL_PROVIDER: YooKassaPaymentStatus[] = [
  "pending",
  "waiting_for_capture",
];

export function isFinalProviderStatus(
  s: YooKassaPaymentStatus,
): boolean {
  return s === "succeeded" || s === "canceled";
}

export function canApplyProviderFinalTransition(
  currentProvider: YooKassaPaymentStatus | null,
  incoming: YooKassaPaymentStatus,
): boolean {
  if (incoming !== "succeeded" && incoming !== "canceled") return false;
  if (currentProvider === "succeeded" || currentProvider === "canceled") {
    return false;
  }
  if (currentProvider === null) return true;
  return NON_FINAL_PROVIDER.includes(currentProvider);
}

export function mapProviderToInternalOnSuccess(): PaymentInternalStatus {
  return "succeeded";
}

export function mapProviderToInternalOnCancel(): PaymentInternalStatus {
  return "canceled";
}
