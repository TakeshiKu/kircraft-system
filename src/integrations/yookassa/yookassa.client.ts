import { Buffer } from "node:buffer";
import type { Logger } from "../../shared/logger/logger.js";
import type { AppConfig } from "../../shared/config/env.js";

export type YooKassaCreateRedirectParams = {
  idempotenceKey: string;
  /** Сумма в основных единицах валюты с двумя знаками после запятой, например "100.00" */
  amountValue: string;
  currency: string;
  returnUrl: string;
  description: string;
  metadata: Record<string, string>;
};

export type YooKassaCreateRedirectResult = {
  externalId: string;
  confirmationUrl: string;
  status: string;
};

/**
 * HTTP-клиент YooKassa API v3 (создание платежа, получение статуса).
 */
export class YooKassaHttpClient {
  constructor(
    private readonly config: AppConfig["yookassa"],
    private readonly log: Logger,
  ) {}

  /**
   * Создание платежа с подтверждением redirect (страница оплаты YooKassa).
   */
  async createRedirectPayment(
    params: YooKassaCreateRedirectParams,
  ): Promise<YooKassaCreateRedirectResult> {
    const { shopId, secretKey, apiUrl } = this.config;
    if (!shopId.trim() || !secretKey.trim()) {
      throw new Error("YooKassa credentials are not configured");
    }
    const base = apiUrl.replace(/\/$/, "");
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
    const body = {
      amount: { value: params.amountValue, currency: params.currency },
      confirmation: { type: "redirect", return_url: params.returnUrl },
      capture: true,
      description: params.description,
      metadata: params.metadata,
    };
    this.log.debug({ idempotenceKey: params.idempotenceKey }, "YooKassa create payment");
    const res = await fetch(`${base}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": params.idempotenceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const desc =
        typeof json.description === "string"
          ? json.description
          : JSON.stringify(json);
      throw new Error(`YooKassa API error ${res.status}: ${desc}`);
    }
    const id = typeof json.id === "string" ? json.id : "";
    const status = typeof json.status === "string" ? json.status : "";
    const conf = json.confirmation as Record<string, unknown> | undefined;
    const url =
      conf && typeof conf.confirmation_url === "string"
        ? conf.confirmation_url
        : "";
    if (!id || !url) {
      throw new Error("YooKassa response missing id or confirmation_url");
    }
    return { externalId: id, confirmationUrl: url, status };
  }

  async createPayment(_body: Record<string, unknown>): Promise<unknown> {
    this.log.debug("YooKassaHttpClient.createPayment (use createRedirectPayment)");
    void this.config;
    throw new Error("Not implemented: use createRedirectPayment");
  }

  async getPayment(_externalId: string): Promise<unknown> {
    void _externalId;
    throw new Error("Not implemented");
  }
}
