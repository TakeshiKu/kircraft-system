import pg from "pg";
import type { Logger } from "../logger/logger.js";

const { Pool } = pg;

export function createPool(databaseUrl: string, log: Logger) {
  const pool = new Pool({ connectionString: databaseUrl });
  pool.on("error", (err) => {
    log.error({ err }, "Unexpected PG pool error");
  });
  return pool;
}

export type DbPool = ReturnType<typeof createPool>;
