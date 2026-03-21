import type { MoneyMinor } from "../../shared/types/money.js";

/** Минимально для корзины / доступности. */
export type Product = {
  productId: string;
  productName: string;
  basePriceMinor: MoneyMinor;
  status: "draft" | "active" | "archived";
};
