import type { Pool, PoolClient } from "pg";
import type { ExternalAccount, User } from "./user.domain.js";

export interface UserRepository {
  findUserById(
    client: Pool | PoolClient,
    userId: string,
  ): Promise<User | null>;

  findUserByExternalAccount(
    client: Pool | PoolClient,
    provider: ExternalAccount["provider"],
    externalUserId: string,
  ): Promise<User | null>;

  /** Резолв текущего пользователя для запроса (MVP: по id или внешней связке). */
  ensureUser(
    client: Pool | PoolClient,
    userId: string,
  ): Promise<User | null>;
}
