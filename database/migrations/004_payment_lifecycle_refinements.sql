-- Этап 2 (точечные улучшения): processing_status, дополнительные индексы, timestamptz.

BEGIN;

-- 1) payment_webhook_events: processed(boolean) -> processing_status(varchar)
ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS processing_status varchar;

UPDATE payment_webhook_events
SET processing_status = CASE
  WHEN processed IS TRUE THEN 'processed'
  ELSE 'pending'
END
WHERE processing_status IS NULL;

ALTER TABLE payment_webhook_events
  ALTER COLUMN processing_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_payment_webhook_events_processing_status'
  ) THEN
    ALTER TABLE payment_webhook_events
      ADD CONSTRAINT chk_payment_webhook_events_processing_status
      CHECK (processing_status IN ('pending', 'processed', 'failed'));
  END IF;
END $$;

ALTER TABLE payment_webhook_events
  DROP COLUMN IF EXISTS processed;

-- 2) Дополнительные индексы
CREATE INDEX IF NOT EXISTS idx_payments_order_internal_status
  ON payments(order_id, internal_status);

CREATE INDEX IF NOT EXISTS idx_payments_expires_at
  ON payments(expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_attempt
  ON payment_idempotency(payment_attempt_id);

-- 3) Payment-related timestamps -> timestamptz (UTC-aware type)
ALTER TABLE payments
  ALTER COLUMN captured_at TYPE timestamptz USING captured_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC',
  ALTER COLUMN paid_at TYPE timestamptz USING paid_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_status_check_at TYPE timestamptz USING last_status_check_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_webhook_at TYPE timestamptz USING last_webhook_at AT TIME ZONE 'UTC';

ALTER TABLE payment_idempotency
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE payment_webhook_events
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

COMMIT;
