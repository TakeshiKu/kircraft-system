import type { Pool, PoolClient } from "pg";
import type { UserRepository } from "./user.repository.js";
import type { ExternalAccount, User } from "./user.domain.js";

/** Заглушка реализации — заменить SQL по schema.dbml */
export class UserRepositoryPg implements UserRepository {
  async findUserById(
    _client: Pool | PoolClient,
    _userId: string,
  ): Promise<User | null> {
    return null;
  }

  async findUserByExternalAccount(
    _client: Pool | PoolClient,
    _provider: ExternalAccount["provider"],
    _externalUserId: string,
  ): Promise<User | null> {
    return null;
  }

  async ensureUser(
    client: Pool | PoolClient,
    userId: string,
  ): Promise<User | null> {
    return this.findUserById(client, userId);
  }
}
