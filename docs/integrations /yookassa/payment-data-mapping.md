# Payment Data Mapping: Kircraft ↔ YooKassa

## Назначение

Документ описывает маппинг данных в сценарии оплаты заказа через YooKassa.

Документ охватывает следующие направления передачи данных:

1. Client Interface -> Backend API Kircraft
2. Backend API Kircraft -> YooKassa API
3. YooKassa API -> Backend API Kircraft
4. YooKassa -> Backend API Kircraft (webhook)

Документ используется совместно с:

- `database/schema.dbml`
- `docs/architecture/data-model.md`
- `docs/architecture/data-model-rules.md`
- `docs/integrations/yookassa/payment-use-case.md`

---

## Источники и контекст

Документ основан на следующих источниках:

1. Внутренний интеграционный сценарий `PAY-01 YooKassa Payment Integration`
2. Актуальная согласованная модель данных Kircraft
3. Фрагменты документации YooKassa, использованные в проекте:
   - `POST /payments`
   - `GET /payments/{payment_id}`
   - объект `Payment`
   - общая логика webhook-уведомлений

---

## Границы документа

Документ описывает:

- маппинг полей
- назначение полей
- место сохранения данных в модели Kircraft
- правила сопоставления статусов

Документ не фиксирует:

- точные имена внутренних endpoint Backend API Kircraft
- полный HTTP-контракт внутренних API
- формат ошибок Backend API Kircraft
- технические детали повторной доставки webhook
- стратегию логирования на уровне инфраструктуры

Эти аспекты должны быть описаны отдельно в API-контрактах и технической документации backend.

---

## Принятые обозначения

### Обязательность

- **M** — обязательное поле
- **O** — необязательное поле
- **C** — условно обязательное поле

### Типы данных

Используются логические типы:

- `string`
- `decimal`
- `boolean`
- `datetime`
- `object`

---

## Архитектурные допущения

1. Клиентские интерфейсы не взаимодействуют с YooKassa напрямую.

2. Все вызовы YooKassa выполняются только через Backend API Kircraft.

3. Одна запись в таблице `payments` соответствует одной попытке оплаты.

4. Один заказ может иметь несколько попыток оплаты.

5. В текущем сценарии используется `capture = true`.

6. `return_url` не является подтверждением успешной оплаты.

7. Успешная оплата подтверждается только:
   - webhook-уведомлением YooKassa
   - либо дополнительной проверкой через `GET /payments/{payment_id}`

8. Во внутренней модели Kircraft основной идентификатор клиента — `customer_id`.

9. В metadata YooKassa для совместимости с согласованным use case используется ключ `user_id`, значением которого является внутренний `customer_id` Kircraft.

---

# 1. Client Interface -> Backend API Kircraft

## Назначение

Клиентский интерфейс инициирует оплату заказа через Backend API Kircraft.

На текущем этапе инициирующий запрос содержит минимальный набор данных:
клиент указывает, какой заказ нужно оплатить, а все остальные параметры платежа
Backend API формирует самостоятельно на основании модели заказа и правил интеграции.

---

## 1.1 Запрос на инициацию оплаты

| Исходное поле (Client Interface) | Целевое поле (Backend API Kircraft) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `order_id` | `order_id` | string | M | Идентификатор заказа, подлежащего оплате |
| контекст аутентификации клиента | `customer_id` | string | M | Клиент определяется системой из канала, токена, сессии или Telegram-контекста |
| контекст канала | `source_channel` | string | C | Может использоваться в backend для трассировки запроса |
| `return_url_override` | не используется | string | O | В текущем сценарии `return_url` формируется backend и не должен передаваться клиентом как источник истины |

---

## 1.2 Ответ Backend API клиентскому интерфейсу после создания платежа

| Исходное поле (Backend API Kircraft) | Целевое поле (Client Interface) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `payments.payment_id` | `payment_id` | string | M | Внутренний идентификатор попытки оплаты |
| `payments.order_id` | `order_id` | string | M | Идентификатор оплачиваемого заказа |
| `payments.status` | `status` | string | M | Внутренний статус попытки оплаты |
| `payments.provider_status` | `provider_status` | string | O | Внешний статус YooKassa, обычно `pending` сразу после создания |
| `payments.external_payment_id` | `external_payment_id` | string | M | Идентификатор платежа в YooKassa |
| `payments.confirmation_url` | `confirmation_url` | string | M | Ссылка на страницу оплаты YooKassa |
| `payments.amount` | `amount` | decimal | M | Сумма платежа |
| `payments.currency` | `currency` | string | M | Валюта платежа |
| `payments.expires_at` | `expires_at` | datetime | O | Срок действия платежа, если присутствует в ответе YooKassa |

---

# 2. Backend API Kircraft -> YooKassa API

## Назначение

Backend API Kircraft создает платеж через `POST /payments`
и при необходимости получает актуальное состояние платежа
через `GET /payments/{payment_id}`.

---

## 2.1 Создание платежа: POST /payments`

### HTTP Headers

| Исходное поле (Kircraft) | Целевое поле (YooKassa) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY` | `Authorization: Basic ...` | string | M | Аутентификация запроса |
| `payments.idempotence_key` | `Idempotence-Key` | string | M | Ключ идемпотентности для защиты от повторного создания платежа |
| системное значение | `Content-Type: application/json` | string | M | Формат тела запроса |

### Body

| Исходное поле (Kircraft) | Целевое поле (YooKassa) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `payments.amount` | `amount.value` | decimal/string | M | Сумма платежа |
| `payments.currency` | `amount.currency` | string | M | Код валюты, например `RUB` |
| константа сценария | `capture` | boolean | M | В текущем сценарии всегда `true` |
| `payments.confirmation_type` | `confirmation.type` | string | M | В текущем сценарии `redirect` |
| `payments.return_url` | `confirmation.return_url` | string | M | URL возврата пользователя после оплаты |
| `payments.description` | `description` | string | O | Описание платежа, не более 128 символов |
| `orders.order_id` | `metadata.order_id` | string | M | Внутренний идентификатор заказа Kircraft |
| `payments.customer_id` | `metadata.user_id` | string | M | Внутренний идентификатор клиента Kircraft, передаваемый в metadata под ключом `user_id` |
| `payments.payment_id` | `metadata.payment_attempt_id` | string | M | Внутренний идентификатор попытки оплаты Kircraft |

---

## 2.2 Получение статуса платежа: GET /payments/{payment_id}

| Исходное поле (Kircraft) | Целевое поле (YooKassa) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `payments.external_payment_id` | path parameter `{payment_id}` | string | M | Внешний идентификатор платежа в YooKassa |
| `YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY` | `Authorization: Basic ...` | string | M | Аутентификация запроса |

---

# 3. YooKassa API -> Backend API Kircraft

## Назначение

Backend API Kircraft получает ответ:

- на создание платежа (`POST /payments`)
- на запрос состояния платежа (`GET /payments/{payment_id}`)

и на его основе создает или обновляет внутреннюю запись в таблице `payments`.

---

## 3.1 Маппинг ответа YooKassa -> таблица `payments`

| Исходное поле (YooKassa) | Целевое поле (Kircraft / DB) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `id` | `payments.external_payment_id` | string | M | Идентификатор платежа в YooKassa |
| `status` | `payments.provider_status` | string | M | Внешний статус платежа |
| логика backend | `payments.status` | string | M | Внутренний статус попытки оплаты Kircraft |
| `paid` | `payments.provider_paid` | boolean | M | Флаг `paid` из объекта YooKassa |
| `amount.value` | `payments.amount` | decimal | M | Сумма платежа |
| `amount.currency` | `payments.currency` | string | M | Валюта платежа |
| `description` | `payments.description` | string | O | Описание платежа |
| `confirmation.type` | `payments.confirmation_type` | string | O | Тип подтверждения |
| `confirmation.confirmation_url` | `payments.confirmation_url` | string | O | Ссылка на страницу оплаты |
| `metadata` | `payments.provider_metadata` | object/text | O | Metadata, переданная в YooKassa и возвращенная обратно |
| `cancellation_details` | `payments.cancellation_details` | object/text | O | Детали отмены платежа |
| `captured_at` | `payments.captured_at` | datetime | O | Время подтверждения платежа у провайдера |
| `expires_at` | `payments.expires_at` | datetime | O | Время истечения срока действия платежа |
| логика backend при успешной оплате | `payments.paid_at` | datetime | O | Внутреннее время признания попытки оплаты успешной |
| время обработки ответа | `payments.updated_at` | datetime | M | Время обновления записи в Kircraft |
| константа обработчика | `payments.last_status_source` | string | M | `create_response` или `poll` |
| время poll-запроса | `payments.last_status_check_at` | datetime | O | Заполняется для ответа на `GET /payments/{payment_id}` |
| полный response body | `payments.provider_response_raw` | object/text | O | Сырой ответ YooKassa для трассировки и диагностики |

---

## 3.2 Маппинг ответа YooKassa -> таблица `orders`

| Условие | Целевое поле (Kircraft / DB) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `payments.provider_status = succeeded` и успешная валидация данных | `orders.status = paid` | string | C | Заказ признается оплаченным |
| `payments.provider_status = succeeded` и успешная валидация данных | `orders.paid_at` | datetime | C | Фиксируется время подтвержденной оплаты заказа |
| `payments.provider_status = canceled` | `orders.status` | без автоматического перевода в `paid` | C | Заказ не должен считаться оплаченным |
| `payments.provider_status = pending` | `orders.status` | без автоматического перевода в `paid` | C | Заказ остается в текущем или ожидающем статусе |

---

# 4. YooKassa -> Backend API Kircraft (webhook)

## Назначение

YooKassa отправляет webhook-уведомление в Backend API Kircraft
о смене состояния платежа.

В текущем сценарии webhook рассматривается как основной источник
подтверждения успешной оплаты, а запрос `GET /payments/{payment_id}`
используется как fallback-механизм.

---

## 4.1 Маппинг webhook payload -> таблица `payments`

| Исходное поле (Webhook YooKassa) | Целевое поле (Kircraft / DB) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `type` | контекст обработки webhook | string | M | Ожидается `notification` |
| `event` | контекст обработки webhook | string | M | Например `payment.succeeded` |
| `object.id` | `payments.external_payment_id` | string | M | По этому полю находится попытка оплаты |
| `object.status` | `payments.provider_status` | string | M | Актуальный внешний статус |
| логика backend | `payments.status` | string | M | Внутренний статус попытки оплаты |
| `object.paid` | `payments.provider_paid` | boolean | O | Флаг `paid` из YooKassa |
| `object.amount.value` | `payments.amount` | decimal | O | Сумма платежа |
| `object.amount.currency` | `payments.currency` | string | O | Валюта платежа |
| `object.metadata` | `payments.provider_metadata` | object/text | O | Metadata из YooKassa |
| `object.cancellation_details` | `payments.cancellation_details` | object/text | O | Детали отмены, если присутствуют |
| `object.captured_at` | `payments.captured_at` | datetime | O | Внешнее время подтверждения платежа |
| логика backend при успешной оплате | `payments.paid_at` | datetime | O | Внутреннее время признания попытки оплаты успешной |
| при успешной обработке webhook | `payments.last_webhook_at` | datetime | M | Время успешной обработки webhook |
| константа обработчика | `payments.last_status_source = webhook` | string | M | Источник обновления статуса |
| полный webhook payload | `payments.provider_response_raw` | object/text | O | Сохраняется для диагностики и трассировки |

---

## 4.2 Маппинг webhook -> таблица `orders`

| Условие | Целевое поле (Kircraft / DB) | Тип данных | Обяз. | Комментарий |
|---|---|---:|:---:|---|
| `object.status = succeeded` и webhook прошел проверку | `orders.status = paid` | string | C | Заказ признается оплаченным |
| `object.status = succeeded` и webhook прошел проверку | `orders.paid_at` | datetime | C | Фиксируется время подтвержденной оплаты заказа |
| `object.status = canceled` | `orders.status` | без автоматического перевода в `paid` | C | Заказ остается неоплаченным |
| `object.status = pending` | `orders.status` | без автоматического перевода в `paid` | C | Заказ остается в текущем/ожидающем состоянии |

---

# 5. Маппинг внутренних и внешних статусов

## 5.1 Внешний статус YooKassa -> внутренний статус попытки оплаты

| YooKassa `provider_status` | Внутренний `payments.status` | Комментарий |
|---|---|---|
| `pending` | `pending` | Платеж создан и ожидает действий пользователя |
| `succeeded` | `succeeded` | Попытка оплаты успешно завершена |
| `canceled` | `canceled` | Попытка оплаты завершилась неуспешно |
| `waiting_for_capture` | `pending` или отдельная обработка по backend-логике | В текущем сценарии `capture = true`, поэтому этот статус не ожидается как основной, но схема его допускает |

## 5.2 Внутренний статус попытки оплаты -> статус заказа

| `payments.status` | `orders.status` | Комментарий |
|---|---|---|
| `created` | без изменения | Попытка оплаты создана во внутренней системе |
| `pending` | без автоматического перевода в `paid` | Заказ ожидает подтверждения оплаты |
| `succeeded` | `paid` | Заказ признается оплаченным |
| `canceled` | без автоматического перевода в `paid` | Заказ остается неоплаченным |
| `error` | без автоматического перевода в `paid` | Ошибка интеграции не означает успешную оплату |

---

# 6. Дополнительные проверки согласованности

## 6.1 Проверки перед созданием платежа

Перед отправкой `POST /payments` Backend API Kircraft должен проверить:

- заказ существует
- заказ принадлежит текущему клиенту
- заказ находится в статусе, допускающем оплату
- для заказа нет другой активной нефинальной попытки оплаты
- сумма заказа корректно рассчитана
- клиент в запросе соответствует `orders.customer_id`

---

## 6.2 Проверки при обработке ответа YooKassa / webhook

Backend API Kircraft должен проверить:

- внешний `payment_id` найден во внутренней системе
- `metadata.order_id` соответствует ожидаемому заказу
- `metadata.user_id` соответствует ожидаемому `customer_id`
- сумма платежа соответствует сумме заказа
- валюта платежа соответствует ожидаемой валюте

---

## 6.3 Проверки статуса заказа

- `return_url` не должен использоваться как подтверждение успешной оплаты
- заказ может перейти в `paid` только после достоверного подтверждения результата оплаты
- при успешной оплате должны обновляться согласованно и `payments`, и `orders`

---

# 7. Что требует отдельного уточнения

На текущем этапе в документе намеренно не зафиксированы точные:

- имена внутренних endpoint Backend API Kircraft
- форматы HTTP-ответов Backend API Kircraft
- форматы ошибок Backend API Kircraft
- журналирование webhook-событий как отдельная таблица/сущность
- стратегия повторной обработки неуспешных webhook

Эти аспекты должны быть описаны отдельно
в API-контракте и технической документации backend.
