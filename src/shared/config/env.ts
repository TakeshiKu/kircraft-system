/**
 * Централизованная конфигурация (без секретов в коде).
 * @see docs/api/conventions.md — окружения dev/prod задаются через NODE_ENV + переменные.
 */
export type AppConfig = {
  nodeEnv: "development" | "production" | "test";
  port: number;
  databaseUrl: string;
  /** MVP: опциональный фиксированный пользователь для разработки */
  authDevUserId: string | null;
  yookassa: {
    shopId: string;
    secretKey: string;
    apiUrl: string;
    /** URL возврата после оплаты (redirect confirmation) */
    returnUrl: string;
  };
  cdek: {
    account: string;
    securePassword: string;
    apiUrl: string;
  };
};

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? "development") as AppConfig["nodeEnv"];
  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
    authDevUserId: process.env.AUTH_DEV_USER_ID?.trim() || null,
    yookassa: {
      shopId: process.env.YOOKASSA_SHOP_ID ?? "",
      secretKey: process.env.YOOKASSA_SECRET_KEY ?? "",
      apiUrl: process.env.YOOKASSA_API_URL ?? "https://api.yookassa.ru/v3",
      returnUrl:
        process.env.YOOKASSA_RETURN_URL?.trim() ||
        "http://127.0.0.1:3000/payment/return",
    },
    cdek: {
      account: process.env.CDEK_ACCOUNT ?? "",
      securePassword: process.env.CDEK_SECURE_PASSWORD ?? "",
      apiUrl: process.env.CDEK_API_URL ?? "https://api.cdek.ru/v2",
    },
  };
}
