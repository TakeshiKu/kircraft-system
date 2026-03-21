import type { MoneyMinor } from "../../shared/types/money.js";
import type { OrderStatus } from "./order-state-machine.js";
import type { SelectedDelivery } from "../delivery/delivery.domain.js";

export type Order = {
  orderId: string;
  customerId: string;
  cartId: string | null;
  status: OrderStatus;
  sourceChannel: string | null;
  city: string;
  itemsTotalMinor: MoneyMinor;
  deliveryPriceMinor: MoneyMinor;
  totalPriceMinor: MoneyMinor;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderItem = {
  orderItemId: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceSnapshotMinor: MoneyMinor;
};

/** Снимок доставки при создании заказа = доменная копия SelectedDelivery + ids. */
export type OrderDeliverySnapshot = SelectedDelivery & {
  orderDeliveryId: string;
  orderId: string;
  status: "confirmed";
};
