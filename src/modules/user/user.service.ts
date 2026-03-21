import type { Pool } from "pg";
import type { UserRepository } from "./user.repository.js";
import type { User } from "./user.domain.js";

/**
 * Регистрация/резолв пользователя по внешнему аккаунту (будущее).
 * MVP: получение профиля по internal id.
 */
export class UserService {
  constructor(
    private readonly pool: Pool,
    private readonly users: UserRepository,
  ) {}

  async getById(userId: string): Promise<User | null> {
    return this.users.ensureUser(this.pool, userId);
  }
}
