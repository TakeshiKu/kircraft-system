import type { Pool, PoolClient } from "pg";
import type { Product } from "./product.domain.js";

export interface ProductRepository {
  findById(
    client: Pool | PoolClient,
    productId: string,
  ): Promise<Product | null>;

  /** Проверка доступности для оформления (active + правила каталога). */
  isAvailableForCart(
    client: Pool | PoolClient,
    productId: string,
  ): Promise<boolean>;
}
