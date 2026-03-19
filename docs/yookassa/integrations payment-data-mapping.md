# YooKassa <-> Kircraft Payment Data Mapping

## Назначение

Документ фиксирует mapping полей между запросами/ответами YooKassa и внутренней моделью Kircraft.
Имена внутренних полей соответствуют актуальной таблице `payments` в `schema.dbml`.

---

## 0) Разделение provider и internal статусов

- `payments.provider_status` — внешний статус от YooKassa (`pending` / `succeeded` / `canceled`).
- `payments.status` — внутренний нормализованный статус Kircraft, используемый для бизнес-логики.
- `provider_status` является источником фактического внешнего состояния платежа.
- Переходы статуса заказа должны определяться по внутреннему `payments.status`, а не по `provider_status` напрямую.

---

## 1) Kircraft -> YooKassa (создание платежа)

| Kircraft (источник) | YooKassa (поле запроса) | Комментарий |
|---|---|---|
| `orders.total_price` | `amount.value` | Итоговая сумма заказа (товары + доставка) |
| `payments.currency` / валюта заказа | `amount.currency` | В текущем flow используется `RUB` |
| `payments.description` | `description` | Описание платежа |
| `payments.return_url` | `confirmation.return_url` | URL возврата после оплаты |
| фиксированное значение | `confirmation.type` | `redirect` |
| фиксированное значение | `capture` | `true` |
| `orders.order_id` | `metadata.order_id` | Идентификатор заказа Kircraft |
| `payments.customer_id` | `metadata.user_id` | Идентификатор клиента в Kircraft |
| `payments.payment_attempt_id` | `metadata.payment_attempt_id` | Бизнес-идентификатор попытки оплаты |
| `orders.total_price` | `metadata.total_amount` | Дублирование суммы в metadata для трассировки |
| `orders.delivery_price` | `metadata.delivery_price` | Стоимость доставки в metadata |

### Правила идемпотентности создания

- Один `payments.payment_attempt_id` соответствует одному `payments.idempotence_key`.
- При повторной инициации той же попытки используется тот же `payment_attempt_id` и тот же `Idempotence-Key`.
- Если у заказа уже есть актуальная нефинальная попытка оплаты, новый платеж во внешней системе не создается — возвращается существующий `confirmation_url`.
- Новая попытка оплаты создается только после финализации предыдущей (или потери валидности ее `confirmation_url`); для новой попытки генерируется новый `payment_attempt_id` и новый `idempotence_key`.

---

## 2) YooKassa -> Kircraft (сохранение ответа/статуса)

| YooKassa (поле) | Kircraft (поле `payments`) | Комментарий |
|---|---|---|
| `id` | `external_payment_id` | Внешний идентификатор платежа YooKassa |
| `status` | `provider_status` | Последний известный внешний статус |
| `paid` | `provider_paid` | Флаг оплаты из YooKassa |
| `amount.value` | `amount` | Сумма платежа |
| `amount.currency` | `currency` | Валюта платежа |
| `description` | `description` | Описание платежа |
| `confirmation.type` | `confirmation_type` | Тип подтверждения |
| `confirmation.confirmation_url` | `confirmation_url` | URL страницы оплаты (для нефинальных) |
| `metadata` | `provider_metadata` | Metadata YooKassa |
| `captured_at` | `captured_at` | Время подтверждения в YooKassa |
| `expires_at` | `expires_at` | Время истечения платежа |
| `cancellation_details` | `cancellation_details` | Детали отмены |
| полный объект ответа | `provider_response_raw` | Сырой ответ провайдера для диагностики |

### Примечание по `created_at`

- `payments.created_at` — время создания записи в Kircraft.
- `created_at` из объекта YooKassa в отдельное поле модели Kircraft сейчас не маппится.
- При необходимости это значение можно читать из `provider_response_raw` / `provider_metadata`.

---

## 3) Mapping статусов

| Статус YooKassa | `payments.status` (Kircraft) | Влияние на статус заказа |
|---|---|---|
| `pending` | `pending` | Заказ остается в `awaiting_payment` |
| `succeeded` | `succeeded` | Заказ переводится в `paid` |
| `canceled` | `canceled` | Заказ не переводится в `paid` |

### Дополнительное правило по устаревшей попытке

Поздний успешный результат по устаревшей попытке оплаты не должен автоматически менять статус заказа.
В таком кейсе попытка оплаты не применяется к заказу (в Kircraft не считается успешной для перевода заказа в `paid`).

### Правила обработки webhook и fallback

- Идентификация webhook/синхронизации выполняется по внешнему `payment_id` (`payments.external_payment_id`).
- Повторная доставка одного и того же webhook не должна приводить к повторным изменениям статусов и дублирующим действиям.
- Разрешенные переходы состояния попытки оплаты:
  - `pending -> succeeded`
  - `pending -> canceled`
- Неразрешенные переходы:
  - `succeeded -> pending`
  - `succeeded -> canceled`
- Если статус получен через fallback-проверку (`GET /payments/{payment_id}` во внешней системе), правила обработки должны быть идентичны webhook.

### Проверка актуальности attempt (late success)

- При обработке внешнего результата система извлекает `metadata.payment_attempt_id`.
- Если `metadata.payment_attempt_id` не совпадает с текущей активной попыткой заказа:
  - статус заказа не изменяется;
  - обновляется только запись соответствующего платежа;
  - случай фиксируется как устаревший платеж (late/stale attempt).
