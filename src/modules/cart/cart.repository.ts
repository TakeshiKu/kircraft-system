import type { Pool, PoolClient } from "pg";
import type { Cart, CartItem } from "./cart.domain.js";

export interface CartRepository {
  findActiveCartByCustomerId(
    client: Pool | PoolClient,
    customerId: string,
  ): Promise<Cart | null>;

  getCartWithItems(
    client: Pool | PoolClient,
    cartId: string,
  ): Promise<{ cart: Cart; items: CartItem[] } | null>;

  addItem(
    client: Pool | PoolClient,
    params: {
      cartId: string;
      productId: string;
      quantity: number;
      selectedValues: Array<{ parameterId: string; parameterValueId: string }>;
    },
  ): Promise<CartItem>;

  updateItemQuantity(
    client: Pool | PoolClient,
    cartItemId: string,
    customerId: string,
    quantity: number,
  ): Promise<CartItem | null>;

  updateItemSelectedValues(
    client: Pool | PoolClient,
    cartItemId: string,
    customerId: string,
    selectedValues: Array<{ parameterId: string; parameterValueId: string }>,
  ): Promise<CartItem | null>;

  deleteItem(
    client: Pool | PoolClient,
    cartItemId: string,
    customerId: string,
  ): Promise<boolean>;

  clearCart(client: Pool | PoolClient, cartId: string): Promise<void>;

  markCartConverted(
    client: Pool | PoolClient,
    cartId: string,
  ): Promise<void>;
}
