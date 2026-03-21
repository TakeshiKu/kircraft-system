import type { DbPool } from "./pool.js";

/**
 * Обёртка транзакции БД для атомарных операций:
 * — создание заказа + order_items + order_deliveries + обновление корзины
 * — создание платежа + внешний вызов (при ошибке — rollback)
 */
export async function withTransaction<T>(
  pool: DbPool,
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
