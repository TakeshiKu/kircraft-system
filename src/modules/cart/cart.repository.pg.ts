import type { Pool, PoolClient } from "pg";
import type { CartRepository } from "./cart.repository.js";
import type { Cart, CartItem } from "./cart.domain.js";

export class CartRepositoryPg implements CartRepository {
  async findActiveCartByCustomerId(
    _c: Pool | PoolClient,
    _customerId: string,
  ): Promise<Cart | null> {
    return null;
  }

  async getCartWithItems(
    _c: Pool | PoolClient,
    _cartId: string,
  ): Promise<{ cart: Cart; items: CartItem[] } | null> {
    return null;
  }

  async addItem(
    _c: Pool | PoolClient,
    _p: Parameters<CartRepository["addItem"]>[1],
  ): Promise<CartItem> {
    throw new Error("Not implemented");
  }

  async updateItemQuantity(
    _c: Pool | PoolClient,
    _id: string,
    _customerId: string,
    _q: number,
  ): Promise<CartItem | null> {
    return null;
  }

  async updateItemSelectedValues(
    _c: Pool | PoolClient,
    _id: string,
    _customerId: string,
    _sv: Array<{ parameterId: string; parameterValueId: string }>,
  ): Promise<CartItem | null> {
    return null;
  }

  async deleteItem(
    _c: Pool | PoolClient,
    _id: string,
    _customerId: string,
  ): Promise<boolean> {
    return false;
  }

  async clearCart(_c: Pool | PoolClient, _cartId: string): Promise<void> {}

  async markCartConverted(_c: Pool | PoolClient, _cartId: string): Promise<void> {}
}
