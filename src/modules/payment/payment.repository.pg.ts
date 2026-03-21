import type { Pool, PoolClient } from "pg";
import type { PaymentRepository } from "./payment.repository.js";
import type { Payment } from "./payment.domain.js";

export class PaymentRepositoryPg implements PaymentRepository {
  async findByIdForCustomer(
    _c: Pool | PoolClient,
    _id: string,
    _customerId: string,
  ): Promise<Payment | null> {
    return null;
  }

  async findByExternalId(
    _c: Pool | PoolClient,
    _ext: string,
  ): Promise<Payment | null> {
    return null;
  }

  async findActiveNonFinalForOrder(
    _c: Pool | PoolClient,
    _orderId: string,
  ): Promise<Payment | null> {
    return null;
  }

  async findByIdempotenceKey(
    _c: Pool | PoolClient,
    _key: string,
  ): Promise<Payment | null> {
    return null;
  }

  async insertPaymentAttempt(
    _c: PoolClient,
    _draft: Omit<Payment, "createdAt" | "updatedAt">,
  ): Promise<Payment> {
    throw new Error("Not implemented");
  }

  async updatePaymentFromProvider(
    _c: PoolClient,
    _p: Parameters<PaymentRepository["updatePaymentFromProvider"]>[1],
  ): Promise<void> {}

  async wasWebhookProcessed(
    _c: Pool | PoolClient,
    _key: string,
  ): Promise<boolean> {
    return false;
  }

  async markWebhookProcessed(_c: PoolClient, _key: string): Promise<void> {}
}
