import type { MoneyMinor } from "../../shared/types/money.js";

export type CartStatus = "active" | "converted" | "abandoned";

export type Cart = {
  cartId: string;
  customerId: string;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CartItemSelectedValue = {
  parameterId: string;
  parameterValueId: string;
};

export type CartItem = {
  cartItemId: string;
  cartId: string;
  productId: string;
  quantity: number;
  selectedValues: CartItemSelectedValue[];
  /** Рассчитано backend */
  lineTotalMinor: MoneyMinor;
  createdAt: Date;
};
