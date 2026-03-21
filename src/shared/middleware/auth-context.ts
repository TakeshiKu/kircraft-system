import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";
import { ErrorCodes } from "../errors/error-codes.js";

/**
 * Контекст аутентификации: канал-агностик (telegram/web не в типе пользователя).
 * userId = внутренний customer_id из БД.
 */
export type AuthContext = {
  userId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

/**
 * MVP: заглушка — в dev подставляет AUTH_DEV_USER_ID или заголовок X-Kircraft-Customer-Id.
 * Прод: заменить на JWT / session, извлекающий customer_id.
 */
export async function attachAuthContext(
  request: FastifyRequest,
  devUserId: string | null,
): Promise<void> {
  const headerId = request.headers["x-kircraft-customer-id"];
  const fromHeader =
    typeof headerId === "string" && headerId.trim() !== ""
      ? headerId.trim()
      : null;
  const userId = fromHeader ?? devUserId;
  if (userId) {
    request.auth = { userId };
  }
}

export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.auth?.userId) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      401,
      "Пользователь не аутентифицирован",
    );
  }
  return request.auth;
}
