# Карта прогресса реализации

## Назначение документа

Проект Kircraft ведётся по принципу **doc-first**: спецификация (vision, business rules, use cases, модель данных, API spec, C4-архитектура) формируется до реализации и опережает код. Этот документ показывает, какие части документации уже воплощены в коде, а какие находятся в плане реализации.

Цель — публичная прозрачность объёма работ и приоритетов, а не учёт дефектов.

---

## Реализовано в коде

### Backend skeleton

- Fastify HTTP-сервер, PostgreSQL pool, структурный логгинг (pino), middleware аутентификации (dev-stub)
- Унифицированный envelope ответа (`data` / `meta` / `error.request_id`) согласно `docs/api/conventions.md`
- Обработка ошибок согласно `docs/api/errors.md` (коды, маппинг HTTP, идемпотентность ответов)

### Order — клиентская сторона (частично)

- `POST /api/v1/orders` — создание черновика заказа в статусе `draft` (MVP checkout flow)
- `PATCH /api/v1/orders/{order_id}/delivery` — привязка выбранной доставки к черновику
- `GET /api/v1/orders` — список заказов клиента
- `GET /api/v1/orders/{order_id}` — детали заказа
- `POST /api/v1/orders/{order_id}/cancel` — отмена клиентом (UC-17, BR-09)

### Payment — наиболее полная реализация модуля

- `POST /api/v1/orders/{order_id}/payments` — создание попытки оплаты (checkout flow)
- `POST /api/v1/payments` — create-or-return активной попытки
- `GET /api/v1/payments/{payment_id}` — статус попытки
- `POST /api/v1/payments/webhook/yookassa` — приём webhook от платёжного провайдера
- Идемпотентность через таблицу `payment_idempotency`
- Дедупликация и replay webhook через `payment_webhook_events`
- Инвариант «одна активная попытка на заказ» через частичный уникальный индекс (BR-19, BR-20)
- Перевод заказа в `paid` только по подтверждённому результату провайдера и только для актуальной попытки (BR-11, BR-21, BR-22)

### Delivery — расчёт

- `POST /api/v1/delivery/calculate` — расчёт доставки и список ПВЗ через CDEK
- `GET /api/v1/delivery/current` — текущий выбранный вариант доставки

### Схема БД

- Полная PostgreSQL-схема `database/schema.postgresql.sql` с таблицами каталога, корзины, заказов, доставок, клиентов, платежей и истории
- Миграции lifecycle оплаты `database/migrations/`

---

## В плане реализации

Следующие части задокументированы и находятся в плане реализации.

### Cart — мутации корзины

- `POST /api/v1/cart/items` — добавление товара в корзину
- `PATCH /api/v1/cart/items/{item_id}` — изменение количества
- `DELETE /api/v1/cart/items/{item_id}` — удаление позиции
- `DELETE /api/v1/cart/items` — очистка корзины

Документация: [docs/api/modules/cart-api.md](../api/modules/cart-api.md). Use cases: UC-06, UC-07.

### Delivery — выбор и фиксация ПВЗ

- `POST /api/v1/delivery/select` — выбор ПВЗ с сохранением во временное состояние оформления заказа

Документация: [docs/api/modules/delivery-api.md §5](../api/modules/delivery-api.md). Use case: UC-08.

### Order — полный checkout из корзины

- `POST /api/v1/orders/from-cart` — создание заказа из активной корзины с фиксацией snapshot товаров, параметров и контактных данных, валидацией (BR-03, BR-23, BR-24)

Документация: [docs/api/modules/order-api.md §7](../api/modules/order-api.md). Use case: UC-08.

### Order — переходы статусов

В коде реализованы только переходы:
- `awaiting_payment → paid` (через webhook оплаты)
- `draft|awaiting_payment|needs_clarification → cancelled` (отмена клиентом)

В плане:
- `draft → awaiting_payment` (подтверждение оформления MVP-flow)
- `awaiting_payment → needs_clarification | rejected` (решения мастера)
- `needs_clarification → awaiting_payment` (после фиксации уточнений)
- `paid → in_progress` (мастер берёт в работу)
- `in_progress → shipped` (мастер отправляет заказ)

Документация: [docs/analysis/order-status-model.md](order-status-model.md). Business rules: BR-12, BR-13, BR-17.

### Admin (бэкофис) — управление заказами

Endpoint'ы для мастера на стороне бэкофиса:

- запрос уточнения по заказу (UC-A1)
- отклонение заказа (UC-A1)
- ручное подтверждение оплаты (альтернативный путь UC-A2)
- перевод оплаченного заказа в работу (UC-A3, BR-12)
- отметка заказа как отправленного (UC-A4, BR-13)

Документация: `docs/api/modules/admin-order-api.md` — черновик не заполнен. Use cases: UC-A1, UC-A2, UC-A3, UC-A4. Архитектурный компонент: `Order Management Module` в `docs/architecture/workspace.dsl`.

### Notifications — уведомления клиенту

Notification Module в архитектуре есть, в коде отсутствует. Не реализованы:

- уведомление клиенту о готовности к оплате (UC-09)
- уведомление о запросе уточнения (UC-10)
- уведомления о смене статуса заказа: paid, in_progress, shipped (UC-11)
- интеграционный сценарий персонализированных AI-уведомлений через n8n + LLM (UC-A7)

Документация: BR-14, UC-09, UC-10, UC-11, UC-A7. Архитектурные компоненты: `Notification Module`, `n8n`, `LLM Provider` в `docs/architecture/workspace.dsl`.

### Snapshot полного заказа

Snapshot товаров (`product_name_snapshot`, `price_snapshot`) и snapshot выбранных параметров (`parameter_name_snapshot`, `value_name_snapshot`) при создании заказа из корзины не пишутся — соответствующая ветка реализуется вместе с `POST /orders/from-cart`.

Документация: BR-23, BR-24, [docs/api/modules/order-api.md §4.4](../api/modules/order-api.md).

### Telegram Bot Gateway

В коде отсутствует. В архитектуре зафиксирован как контейнер `Bot Gateway` с интеграцией к Telegram/VK/MAX. Текущая аутентификация бэкенда — dev-stub без интеграции с мессенджерами.

Документация: [docs/product/vision.md](../product/vision.md), [docs/architecture/workspace.dsl](../architecture/workspace.dsl). Use cases клиента: UC-01..UC-17.

### AI Assistant Module и AI-уведомления

В коде отсутствует. В архитектуре зафиксированы:

- `AI Assistant Module` (бэкофис: AI-черновики описаний товаров, AI-summary переписки заказов)
- внешняя система `LLM Provider`
- интеграционный сценарий через `n8n + LLM Provider` для персонализированных уведомлений

Документация: [AI_INTEGRATION_BRIEF.md](../../AI_INTEGRATION_BRIEF.md), [docs/product/vision.md](../product/vision.md) (раздел «AI как часть продукта»), use cases UC-A5, UC-A6, UC-A7, business rules BR-AI-01..BR-AI-06.

---

## Связь со схемой БД

Схема БД (`database/schema.postgresql.sql`) сознательно опережает код и содержит таблицы под будущие сценарии:

- `staff_users`, `order_status_history` — под admin flow и аудит переходов статусов
- `order_clarifications` — под сценарии запроса уточнений (UC-A1, UC-10)
- `order_deliveries` — историческая таблица попыток выбора доставки (multi-attempt log; источник истины для текущей доставки — денормализованные поля `orders.*`)
- `payment_idempotency`, `payment_webhook_events` — реализованные таблицы инфраструктуры оплаты

---

## Принцип чтения этого документа

- Раздел «Реализовано в коде» — то, что можно вызвать через работающий backend.
- Раздел «В плане реализации» — то, что зафиксировано в документации и ждёт реализации в одной из следующих итераций.
- Этот документ должен поддерживаться в актуальном состоянии при изменении состояния backend и при появлении новых разделов в документации.
