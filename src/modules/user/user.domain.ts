/**
 * Доменный пользователь — не зависит от канала (Telegram/Web).
 * В БД: customers + customer_external_accounts.
 */
export type User = {
  id: string;
  customerName: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ExternalAccount = {
  id: string;
  userId: string;
  provider: "telegram" | "web" | "mini_app" | "max" | "other";
  externalUserId: string;
  externalUsername: string | null;
  isPrimary: boolean;
  active: boolean;
};
