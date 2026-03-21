import type { Logger } from "../../shared/logger/logger.js";

/**
 * Единый structured payload для логов payment-модуля (snake_case).
 * Сообщение pino — второй аргумент, дублирует `event` для человекочитаемого grep.
 */
export type PaymentLogPayload = {
  scope: string;
  event: string;
  request_id?: string;
  order_id?: string;
  payment_id?: string;
  payment_attempt_id?: string;
  external_payment_id?: string;
  customer_id?: string;
  status?: string;
  reason?: string;
  details?: Record<string, unknown>;
};

function compactPayload(p: PaymentLogPayload): Record<string, unknown> {
  const out: Record<string, unknown> = { scope: p.scope, event: p.event };
  if (p.request_id !== undefined) out.request_id = p.request_id;
  if (p.order_id !== undefined) out.order_id = p.order_id;
  if (p.payment_id !== undefined) out.payment_id = p.payment_id;
  if (p.payment_attempt_id !== undefined) out.payment_attempt_id = p.payment_attempt_id;
  if (p.external_payment_id !== undefined) out.external_payment_id = p.external_payment_id;
  if (p.customer_id !== undefined) out.customer_id = p.customer_id;
  if (p.status !== undefined) out.status = p.status;
  if (p.reason !== undefined) out.reason = p.reason;
  if (p.details !== undefined && Object.keys(p.details).length > 0) {
    out.details = p.details;
  }
  return out;
}

export function logPayment(
  logger: Logger | undefined,
  level: "info" | "warn" | "error",
  payload: PaymentLogPayload,
  error?: unknown,
): void {
  if (!logger) return;
  const base = compactPayload(payload);
  if (level === "error" && error !== undefined) {
    base.details = {
      ...(typeof payload.details === "object" && payload.details !== null
        ? payload.details
        : {}),
      error_message: error instanceof Error ? error.message : String(error),
      error_name: error instanceof Error ? error.name : "unknown",
    };
  }
  logger[level](base, payload.event);
}

export const PAYMENT_LOG_SCOPE = {
  POST: "payment_post",
  WEBHOOK: "payment_webhook",
  REPLAY: "payment_replay",
} as const;
