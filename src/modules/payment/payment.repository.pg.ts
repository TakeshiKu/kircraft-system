import type { Pool, PoolClient } from "pg";
import type { CreatePaymentRow, PaymentRepository } from "./payment.repository.js";
import type { Payment } from "./payment.domain.js";

export class PaymentRepositoryPg implements PaymentRepository {
  private mapRow(row: {
    payment_id: string;
    order_id: string;
    customer_id: string;
    amount: string | number;
    currency: string;
    internal_status: Payment["status"];
    provider_status: string | null;
    external_payment_id: string | null;
    idempotence_key: string;
    payment_attempt_id: string;
    confirmation_url: string | null;
    expires_at: Date | null;
    paid_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }): Payment {
    const amountMinor =
      typeof row.amount === "string" ? Number(row.amount) : Number(row.amount);
    return {
      paymentId: row.payment_id,
      orderId: row.order_id,
      customerId: row.customer_id,
      amountMinor: Number.isFinite(amountMinor) ? amountMinor : 0,
      currency: row.currency,
      status: row.internal_status,
      providerStatus: row.provider_status,
      externalPaymentId: row.external_payment_id,
      idempotenceKey: row.idempotence_key,
      paymentAttemptId: row.payment_attempt_id,
      confirmationUrl: row.confirmation_url,
      expiresAt: row.expires_at,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByIdForCustomer(
    c: Pool | PoolClient,
    id: string,
    customerId: string,
  ): Promise<Payment | null> {
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         internal_status,
         provider_status,
         external_payment_id,
         idempotence_key,
         payment_attempt_id,
         confirmation_url,
         expires_at,
         paid_at,
         created_at,
         updated_at
       FROM payments
       WHERE payment_id = $1
         AND customer_id = $2`,
      [id, customerId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async findByExternalId(
    c: Pool | PoolClient,
    ext: string,
  ): Promise<Payment | null> {
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         internal_status,
         provider_status,
         external_payment_id,
         idempotence_key,
         payment_attempt_id,
         confirmation_url,
         expires_at,
         paid_at,
         created_at,
         updated_at
       FROM payments
       WHERE external_payment_id = $1
      ORDER BY created_at DESC, payment_id DESC
       LIMIT 1`,
      [ext],
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async findActiveNonFinalForOrder(
    c: Pool | PoolClient,
    orderId: string,
  ): Promise<Payment | null> {
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         internal_status,
         provider_status,
         external_payment_id,
         idempotence_key,
         payment_attempt_id,
         confirmation_url,
         expires_at,
         paid_at,
         created_at,
         updated_at
       FROM payments
       WHERE order_id = $1
         AND internal_status IN ('created', 'pending')
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC, payment_id DESC
       LIMIT 1`,
      [orderId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async findByIdempotenceKey(
    c: Pool | PoolClient,
    key: string,
  ): Promise<Payment | null> {
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         internal_status,
         provider_status,
         external_payment_id,
         idempotence_key,
         payment_attempt_id,
         confirmation_url,
         expires_at,
         paid_at,
         created_at,
         updated_at
       FROM payments
       WHERE idempotence_key = $1
       ORDER BY created_at DESC, payment_id DESC
       LIMIT 1`,
      [key],
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async findByClientIdempotency(
    c: Pool | PoolClient,
    customerId: string,
    idempotencyKey: string,
  ): Promise<Payment | null> {
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         p.payment_id,
         p.order_id,
         p.customer_id,
         p.amount,
         p.currency,
         p.internal_status,
         p.provider_status,
         p.external_payment_id,
         p.idempotence_key,
         p.payment_attempt_id,
         p.confirmation_url,
         p.expires_at,
         p.paid_at,
         p.created_at,
         p.updated_at
       FROM payment_idempotency i
       JOIN payments p
         ON p.payment_attempt_id = i.payment_attempt_id
       WHERE i.customer_id = $1
         AND i.idempotency_key = $2
       LIMIT 1`,
      [customerId, idempotencyKey],
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async saveClientIdempotency(
    c: Pool | PoolClient,
    params: {
      id: string;
      customerId: string;
      orderId: string;
      paymentAttemptId: string;
      idempotencyKey: string;
    },
  ): Promise<{ paymentAttemptId: string }> {
    await c.query(
      `INSERT INTO payment_idempotency (
         id,
         idempotency_key,
         customer_id,
         order_id,
         payment_attempt_id,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (idempotency_key, customer_id) DO NOTHING`,
      [
        params.id,
        params.idempotencyKey,
        params.customerId,
        params.orderId,
        params.paymentAttemptId,
      ],
    );

    const res = await c.query<{ payment_attempt_id: string }>(
      `SELECT payment_attempt_id
       FROM payment_idempotency
       WHERE idempotency_key = $1
         AND customer_id = $2`,
      [params.idempotencyKey, params.customerId],
    );
    const row = res.rows[0];
    if (!row) {
      throw new Error("Failed to resolve payment_idempotency row after insert/select");
    }
    return { paymentAttemptId: row.payment_attempt_id };
  }

  async insertPaymentAttempt(
    c: PoolClient,
    draft: Omit<Payment, "createdAt" | "updatedAt">,
  ): Promise<Payment> {
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO payments (
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         status,
         internal_status,
         provider_status,
         provider_paid,
         external_payment_id,
         idempotence_key,
         confirmation_url,
         expires_at,
         paid_at,
         payment_attempt_id,
         created_at,
         updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $6, $7, false, $8, $9, $10, $11, $12, $13, NOW(), NOW()
       )
       RETURNING
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         internal_status,
         provider_status,
         external_payment_id,
         idempotence_key,
         payment_attempt_id,
         confirmation_url,
         expires_at,
         paid_at,
         created_at,
         updated_at`,
      [
        draft.paymentId,
        draft.orderId,
        draft.customerId,
        draft.amountMinor,
        draft.currency,
        draft.status,
        draft.providerStatus,
        draft.externalPaymentId,
        draft.idempotenceKey,
        draft.confirmationUrl,
        draft.expiresAt,
        draft.paidAt,
        draft.paymentAttemptId,
      ],
    );
    const row = res.rows[0];
    if (!row) {
      throw new Error("Failed to insert payment attempt");
    }
    return this.mapRow(row);
  }

  async createPayment(pool: Pool, data: CreatePaymentRow): Promise<void> {
    await pool.query(
      `INSERT INTO payments (
        payment_id,
        order_id,
        customer_id,
        amount,
        currency,
        status,
        internal_status,
        provider_status,
        provider_paid,
        external_payment_id,
        idempotence_key,
        description,
        confirmation_type,
        return_url,
        confirmation_url,
        payment_attempt_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $6, $7, false, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      )`,
      [
        data.paymentId,
        data.orderId,
        data.customerId,
        data.amountMinor,
        data.currency,
        data.status,
        data.providerStatus,
        data.externalPaymentId,
        data.idempotenceKey,
        data.description,
        data.confirmationType,
        data.returnUrl,
        data.confirmationUrl,
        data.paymentAttemptId,
      ],
    );
  }

  async updatePaymentAfterProviderCreate(
    c: PoolClient,
    p: {
      paymentId: string;
      externalPaymentId: string;
      providerStatus: string;
      confirmationUrl: string;
      source?: string | null;
    },
  ): Promise<void> {
    await c.query(
      `UPDATE payments
       SET
         internal_status = 'pending',
         status = 'pending',
         external_payment_id = $2,
         provider_status = $3,
         confirmation_url = $4,
         updated_at = NOW(),
         last_status_source = COALESCE($5, 'api')
       WHERE payment_id = $1`,
      [
        p.paymentId,
        p.externalPaymentId,
        p.providerStatus,
        p.confirmationUrl,
        p.source ?? "api",
      ],
    );
  }

  async setPaymentAttemptError(
    c: PoolClient,
    p: { paymentId: string },
  ): Promise<void> {
    await c.query(
      `UPDATE payments
       SET
         internal_status = 'error',
         status = 'error',
         updated_at = NOW(),
         last_status_source = 'provider'
       WHERE payment_id = $1`,
      [p.paymentId],
    );
  }

  async updatePaymentFromProvider(
    c: PoolClient,
    p: Parameters<PaymentRepository["updatePaymentFromProvider"]>[1],
  ): Promise<void> {
    await c.query(
      `UPDATE payments
       SET
         status = $2,
         internal_status = $2,
         provider_status = $3,
         provider_paid = CASE
           WHEN $6 IS NOT NULL THEN $6::boolean
           WHEN $3 = 'succeeded' THEN true
           ELSE provider_paid
         END,
         paid_at = $4,
         updated_at = NOW(),
         last_webhook_at = NOW(),
         last_status_source = COALESCE($5, last_status_source)
       WHERE payment_id = $1`,
      [
        p.paymentId,
        p.status,
        p.providerStatus,
        p.paidAt,
        p.source ?? null,
        p.providerPaid !== undefined ? p.providerPaid : null,
      ],
    );
  }

  async getActualAttemptForOrder(
    c: Pool | PoolClient,
    orderId: string,
  ): Promise<Payment | null> {
    const active = await this.findActiveNonFinalForOrder(c, orderId);
    if (active) return active;
    const res = await c.query<{
      payment_id: string;
      order_id: string;
      customer_id: string;
      amount: string | number;
      currency: string;
      internal_status: Payment["status"];
      provider_status: string | null;
      external_payment_id: string | null;
      idempotence_key: string;
      payment_attempt_id: string;
      confirmation_url: string | null;
      expires_at: Date | null;
      paid_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         payment_id,
         order_id,
         customer_id,
         amount,
         currency,
         internal_status,
         provider_status,
         external_payment_id,
         idempotence_key,
         payment_attempt_id,
         confirmation_url,
         expires_at,
         paid_at,
         created_at,
         updated_at
       FROM payments
       WHERE order_id = $1
       ORDER BY created_at DESC, payment_id DESC
       LIMIT 1`,
      [orderId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async lockOrderPayments(c: PoolClient, orderId: string): Promise<void> {
    await c.query(
      `SELECT payment_id
       FROM payments
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId],
    );
  }

  async wasWebhookProcessed(
    c: Pool | PoolClient,
    externalPaymentId: string,
    providerStatus: string,
  ): Promise<boolean> {
    const res = await c.query<{ one: number }>(
      `SELECT 1 AS one
       FROM payment_webhook_events
       WHERE external_payment_id = $1
         AND provider_status = $2
         AND processing_status = 'processed'
       LIMIT 1`,
      [externalPaymentId, providerStatus],
    );
    return res.rows.length > 0;
  }

  async lockWebhookEventForUpdate(
    c: PoolClient,
    externalPaymentId: string,
    providerStatus: string,
  ): Promise<{ processingStatus: "pending" | "processed" | "failed" } | null> {
    const res = await c.query<{
      processing_status: "pending" | "processed" | "failed";
    }>(
      `SELECT processing_status
       FROM payment_webhook_events
       WHERE external_payment_id = $1
         AND provider_status = $2
       FOR UPDATE`,
      [externalPaymentId, providerStatus],
    );
    const row = res.rows[0];
    if (!row) return null;
    return { processingStatus: row.processing_status };
  }

  async markWebhookProcessed(
    c: PoolClient,
    externalPaymentId: string,
    providerStatus: string,
  ): Promise<void> {
    await c.query(
      `UPDATE payment_webhook_events
       SET processing_status = 'processed'
       WHERE external_payment_id = $1
         AND provider_status = $2`,
      [externalPaymentId, providerStatus],
    );
  }

  async saveWebhookEvent(
    c: Pool | PoolClient,
    params: {
      id: string;
      externalPaymentId: string;
      providerStatus: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    await c.query(
      `INSERT INTO payment_webhook_events (
         id,
         external_payment_id,
         provider_status,
         payload,
         processing_status,
         created_at
       ) VALUES ($1, $2, $3, $4::jsonb, 'pending', NOW())
       ON CONFLICT (external_payment_id, provider_status) DO NOTHING`,
      [
        params.id,
        params.externalPaymentId,
        params.providerStatus,
        JSON.stringify(params.payload),
      ],
    );
  }

  async listPendingWebhookEventsByExternalPaymentId(
    c: Pool | PoolClient,
    externalPaymentId: string,
  ): Promise<Array<{ providerStatus: string; payload: Record<string, unknown> }>> {
    const res = await c.query<{
      provider_status: string;
      payload: unknown;
    }>(
      `SELECT provider_status, payload
       FROM payment_webhook_events
       WHERE external_payment_id = $1
         AND processing_status = 'pending'
       ORDER BY created_at ASC, id ASC`,
      [externalPaymentId],
    );
    return res.rows.map((r) => ({
      providerStatus: r.provider_status,
      payload:
        r.payload !== null && typeof r.payload === "object"
          ? (r.payload as Record<string, unknown>)
          : {},
    }));
  }

  async listPendingWebhookEvents(
    c: Pool | PoolClient,
    params: { limit: number },
  ): Promise<
    Array<{
      externalPaymentId: string;
      providerStatus: string;
      payload: Record<string, unknown>;
    }>
  > {
    const res = await c.query<{
      external_payment_id: string;
      provider_status: string;
      payload: unknown;
    }>(
      `SELECT external_payment_id, provider_status, payload
       FROM payment_webhook_events
       WHERE processing_status = 'pending'
       ORDER BY created_at ASC, id ASC
       LIMIT $1`,
      [params.limit],
    );
    return res.rows.map((r) => ({
      externalPaymentId: r.external_payment_id,
      providerStatus: r.provider_status,
      payload:
        r.payload !== null && typeof r.payload === "object"
          ? (r.payload as Record<string, unknown>)
          : {},
    }));
  }
}
