import { AppError } from "../../shared/errors/app-error.js";
import { ErrorCodes } from "../../shared/errors/error-codes.js";

/**
 * Ошибки провайдера YooKassa при POST /api/v1/payments (после записи attempt в БД).
 * Соответствует docs/api/modules/payment-api.md: 502 / 503, не смешивать с payment_create_failed.
 */
export function mapYooKassaFailureToAppError(err: unknown): AppError {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("credentials are not configured")) {
    return new AppError(
      ErrorCodes.PAYMENT_CREATE_FAILED,
      500,
      "Payment provider is not configured",
      { reason: "yookassa_credentials_missing" },
    );
  }
  const m = msg.match(/YooKassa API error (\d+)/);
  const status = m ? parseInt(m[1], 10) : 0;
  if (status >= 500) {
    return new AppError(
      ErrorCodes.PAYMENT_PROVIDER_UNAVAILABLE,
      503,
      "Payment provider temporarily unavailable",
      { reason: msg },
    );
  }
  if (status >= 400) {
    return new AppError(
      ErrorCodes.PAYMENT_PROVIDER_ERROR,
      502,
      "Payment provider rejected the request",
      { reason: msg },
    );
  }
  return new AppError(
    ErrorCodes.PAYMENT_PROVIDER_UNAVAILABLE,
    503,
    "Payment provider request failed",
    { reason: msg },
  );
}
