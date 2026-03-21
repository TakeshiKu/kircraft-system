-- Этап 2 (закрытие рисков): default processing_status + индекс очереди pending webhook.

BEGIN;

-- 1) processing_status default
ALTER TABLE payment_webhook_events
  ALTER COLUMN processing_status SET DEFAULT 'pending';

-- 2) целевой индекс для выборки необработанных webhook-событий
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_pending_created_at
  ON payment_webhook_events(created_at)
  WHERE processing_status = 'pending';

COMMIT;
