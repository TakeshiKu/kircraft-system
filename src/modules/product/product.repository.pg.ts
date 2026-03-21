import type { Pool, PoolClient } from "pg";
import type { ProductRepository } from "./product.repository.js";
import type { Product } from "./product.domain.js";

export class ProductRepositoryPg implements ProductRepository {
  async findById(
    _client: Pool | PoolClient,
    _productId: string,
  ): Promise<Product | null> {
    return null;
  }

  async isAvailableForCart(
    _client: Pool | PoolClient,
    _productId: string,
  ): Promise<boolean> {
    return false;
  }
}
