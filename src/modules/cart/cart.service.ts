import type { Pool } from "pg";
import type { CartRepository } from "./cart.repository.js";
import type { ProductRepository } from "../product/product.repository.js";
import type { Cart, CartItem } from "./cart.domain.js";
import type { AddCartItemBodyDto, PatchCartItemBodyDto } from "./cart.dto.js";

/**
 * Корзина привязана к пользователю (customer_id).
 * Цены и доступность — только с backend, не из DTO клиента.
 */
export class CartService {
  constructor(
    private readonly pool: Pool,
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
  ) {}

  async getCart(customerId: string): Promise<{ cart: Cart; items: CartItem[] } | null> {
    const cart = await this.carts.findActiveCartByCustomerId(this.pool, customerId);
    if (!cart) return null;
    return this.carts.getCartWithItems(this.pool, cart.cartId);
  }

  async addItem(
    customerId: string,
    body: AddCartItemBodyDto,
  ): Promise<CartItem> {
    void this.products;
    void customerId;
    void body;
    throw new Error("Not implemented");
  }

  async patchItem(
    customerId: string,
    cartItemId: string,
    body: PatchCartItemBodyDto,
  ): Promise<CartItem | null> {
    void customerId;
    void cartItemId;
    void body;
    return null;
  }

  async deleteItem(customerId: string, cartItemId: string): Promise<boolean> {
    return this.carts.deleteItem(this.pool, cartItemId, customerId);
  }

  async clearCart(customerId: string): Promise<void> {
    const cart = await this.carts.findActiveCartByCustomerId(this.pool, customerId);
    if (cart) await this.carts.clearCart(this.pool, cart.cartId);
  }
}
