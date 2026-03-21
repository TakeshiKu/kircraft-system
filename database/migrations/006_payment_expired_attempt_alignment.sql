-- Выравнивание «активной» попытки с partial unique index uq_payments_active_non_final_order.
--
-- Проблема: индекс учитывает только internal_status IN ('created','pending'), без expires_at,
-- тогда как findActiveNonFinalForOrder исключает просроченные строки. Из-за этого просроченная
-- pending/created блокировала INSERT новой попытки и могла ошибочно считаться «актуальной» в webhook.
--
-- Решение (данные): однократно перевести уже просроченные created/pending в canceled с источником expiry.
-- Дальнейшие переходы выполняет приложение в той же транзакции, что и lockOrderPayments (см. PaymentRepository).

BEGIN;

UPDATE payments
SET
  internal_status = 'canceled',
  status = 'canceled',
  updated_at = NOW(),
  last_status_source = 'expiry'
WHERE internal_status IN ('created', 'pending')
  AND expires_at IS NOT NULL
  AND expires_at <= NOW();

COMMIT;
