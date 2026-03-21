-- Этап 2: БД-фундамент payment lifecycle (контрактный).
-- Важно: без бизнес-логики в сервисах/хендлерах, только schema-level гарантии.

BEGIN;

-- 1) payments: внутренний статус (канонический) + ограничения статусов
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS internal_status varchar;

UPDATE payments
SET internal_status = CASE
  WHEN status IN ('created', 'pending', 'succeeded', 'canceled', 'error') THEN status
  ELSE 'error'
END
WHERE internal_status IS NULL;

ALTER TABLE payments
  ALTER COLUMN internal_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_payments_internal_status'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT chk_payments_internal_status
      CHECK (internal_status IN ('created', 'pending', 'succeeded', 'canceled', 'error'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_payments_provider_status'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT chk_payments_provider_status
      CHECK (
        provider_status IS NULL
        OR provider_status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled')
      );
  END IF;
END $$;

-- 2) client idempotency storage (response snapshot не хранится)
CREATE TABLE IF NOT EXISTS payment_idempotency (
  id varchar PRIMARY KEY,
  idempotency_key varchar(128) NOT NULL,
  customer_id varchar NOT NULL,
  order_id varchar NOT NULL,
  payment_attempt_id varchar NOT NULL,
  created_at timestamp NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_payment_idempotency_key_customer'
  ) THEN
    ALTER TABLE payment_idempotency
      ADD CONSTRAINT uq_payment_idempotency_key_customer
      UNIQUE (idempotency_key, customer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_payment_idempotency_customer'
  ) THEN
    ALTER TABLE payment_idempotency
      ADD CONSTRAINT fk_payment_idempotency_customer
      FOREIGN KEY (customer_id)
      REFERENCES customers(customer_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_payment_idempotency_order'
  ) THEN
    ALTER TABLE payment_idempotency
      ADD CONSTRAINT fk_payment_idempotency_order
      FOREIGN KEY (order_id)
      REFERENCES orders(order_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_payment_idempotency_attempt'
  ) THEN
    ALTER TABLE payment_idempotency
      ADD CONSTRAINT fk_payment_idempotency_attempt
      FOREIGN KEY (payment_attempt_id)
      REFERENCES payments(payment_attempt_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 3) webhook dedupe + early storage (отдельная таблица, не payments)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id varchar PRIMARY KEY,
  external_payment_id varchar NOT NULL,
  provider_status varchar NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_payment_webhook_events_external_status'
  ) THEN
    ALTER TABLE payment_webhook_events
      ADD CONSTRAINT uq_payment_webhook_events_external_status
      UNIQUE (external_payment_id, provider_status);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_payment_webhook_events_provider_status'
  ) THEN
    ALTER TABLE payment_webhook_events
      ADD CONSTRAINT chk_payment_webhook_events_provider_status
      CHECK (provider_status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled'));
  END IF;
END $$;

-- 4) индексы для lookup-операций
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
-- payment_attempt_id уже UNIQUE, дополнительный индекс не требуется.
CREATE INDEX IF NOT EXISTS idx_payments_external_payment_id ON payments(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_payment_id ON payments(customer_id, payment_id);
-- (idempotency_key, customer_id) покрывается UNIQUE uq_payment_idempotency_key_customer.
-- (external_payment_id, provider_status) покрывается UNIQUE uq_payment_webhook_events_external_status.

-- 5) ограничение "одна активная нефинальная попытка на заказ"
-- В индексе запрещено использовать NOW(), поэтому expires_at-проверка остается в repository/service.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_active_non_final_order
  ON payments(order_id)
  WHERE internal_status IN ('created', 'pending');

COMMIT;
