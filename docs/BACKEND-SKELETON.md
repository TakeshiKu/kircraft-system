# Backend skeleton Kircraft (MVP vertical slice)

Каркас в `src/` + `database/migrations/001_checkout_delivery_state.sql`.  
Контракты API не дублируются здесь — см. `docs/api/modules/*`.

## 1. Дерево проекта

```
src/
  app.ts
  server.ts
  integrations/
    cdek/
      cdek.client.ts
      cdek.service.ts
      index.ts
    yookassa/
      yookassa.client.ts
      yookassa.service.ts
      index.ts
  modules/
    user/
      user.domain.ts
      user.repository.ts
      user.repository.pg.ts
      user.service.ts
      index.ts
    product/
      product.domain.ts
      product.repository.ts
      product.repository.pg.ts
      index.ts
    cart/
      cart.domain.ts
      cart.dto.ts
      cart.repository.ts
      cart.repository.pg.ts
      cart.service.ts
      cart.handler.ts
      index.ts
    delivery/
      delivery.domain.ts
      delivery.dto.ts
      delivery.repository.ts
      delivery.repository.pg.ts
      delivery.service.ts
      delivery.handler.ts
      index.ts
    order/
      order-state-machine.ts
      order.domain.ts
      order.dto.ts
      order.repository.ts
      order.repository.pg.ts
      order.service.ts
      order.handler.ts
      index.ts
    payment/
      payment-state-machine.ts
      payment.domain.ts
      payment.dto.ts
      payment.repository.ts
      payment.repository.pg.ts
      payment.service.ts
      payment-webhook.service.ts
      payment.handler.ts
      index.ts
  shared/
    config/
    db/
    errors/
    logger/
    middleware/
    types/
    utils/
database/migrations/
  001_checkout_delivery_state.sql
```

## 2. Маппинг HTTP → handler → service → repository

| Метод | Handler | Service | Repository / интеграция |
|-------|---------|---------|-------------------------|
| `GET/POST/PATCH/DELETE …/cart*` | `cart.handler` | `CartService` | `CartRepository`, `ProductRepository` |
| `POST /delivery/calculate` | `delivery.handler` | `DeliveryService` | `CartRepository`, `CheckoutDeliveryRepository`, `CdekService` |
| `POST /delivery/select` | `delivery.handler` | `DeliveryService` | то же |
| `GET /delivery/current` | `delivery.handler` | `DeliveryService` | то же |
| `POST /api/v1/orders` | `order.handler` | `OrderService.createDraft` | `OrderRepository` |
| `PATCH /api/v1/orders/:order_id/delivery` | `order.handler` | `OrderService.setDelivery` | `OrderRepository` |
| `POST /api/v1/orders/from-cart` | `order.handler` | `OrderService` | `OrderRepository`, `CartRepository`, `CheckoutDeliveryRepository` (+ транзакция) |
| `GET /orders`, `GET /orders/:id`, `POST …/cancel` | `order.handler` | `OrderService` | `OrderRepository` |
| `POST /api/v1/orders/:order_id/payments` | `payment.handler` | `PaymentService.create` | `PaymentRepository`, `OrderRepository`, `YooKassaService` |
| `POST /api/v1/payments` | `payment.handler` | `PaymentService.createOrReturnPayment` | `PaymentRepository`, `OrderRepository`, `YooKassaService` |
| `GET /api/v1/payments/:id` | `payment.handler` | `PaymentService` | `PaymentRepository` |
| `POST /api/v1/payments/webhook/yookassa` | `payment.handler` | `PaymentWebhookService` | `PaymentRepository`, `OrderRepository` |

**Зависимости между модулями (направление вызовов):**

- `delivery` → `cart`, `integrations/cdek` (через `CdekService`, не через `CdekHttpClient`)
- `order` → `cart`, `delivery` (checkout state)
- `payment` → `order` (проверка заказа/статуса), `integrations/yookassa` (через `YooKassaService`)
- `payment` webhook → `payment` + `order` (атомарное обновление платежа и заказа — в реализации)

## 3. Доменные сущности (минимум)

| Сущность | Файл | Примечание |
|----------|------|------------|
| User | `user.domain.ts` | = `customer_id` в БД, без привязки к каналу |
| ExternalAccount | `user.domain.ts` | маппинг на `customer_external_accounts` |
| Cart, CartItem | `cart.domain.ts` | привязка к пользователю |
| SelectedDelivery, DeliveryOption | `delivery.domain.ts` | до заказа — в JSON checkout-таблицы |
| Order, OrderItem, OrderDeliverySnapshot | `order.domain.ts` | заказ и снимок доставки |
| Payment | `payment.domain.ts` | привязка к пользователю и заказу |
| Product | `product.domain.ts` | чтение для корзины/доступности |

## 4. DTO vs Domain

- `*.dto.ts` — поля в стиле API (`snake_case` в JSON по контракту); маппинг в `handler` или тонком слое.
- `*.domain.ts` — внутренние типы (`camelCase`), не экспортировать наружу как ответ API без преобразования.

## 5. State machine

- Заказ: `order-state-machine.ts` — `canClientCancel`, `nextStatusAfterSuccessfulPayment`, старт checkout `awaiting_payment`.
- Платёж: `payment-state-machine.ts` — финальность провайдера, допустимые переходы `pending` / `waiting_for_capture` → `succeeded` | `canceled`.

Логику переходов не дублировать в сервисах — вызывать функции из этих файлов.

## 6. Идемпотентность

- `POST /api/v1/payments`: для каждого запроса к YooKassa генерируется свой `Idempotence-Key` (UUID); заголовок клиента `Idempotency-Key` в текущей реализации не используется. Метод `createOrReturnPayment` (идемпотентность по ключу клиента) не реализован.
- Webhook: дедуп по паре `(external_payment_id, статус)` или отдельная таблица `webhook_events` (реализовать в `PaymentRepository` / миграции).

## 7. Транзакции

Использовать `shared/db/transaction.ts` → `withTransaction`:

- **Создание заказа:** `orders` + `order_items` + `order_item_selected_values` + `order_deliveries` + `carts.status = converted` + очистка/инвалидация checkout-доставки (по политике).
- **Создание платежа:** вставка `payments` + вызов YooKassa; при ошибке провайдера — rollback или компенсирующее обновление (зафиксировать в коде явно).
- **Webhook:** обновление `payments` + `orders` (+ `paid_at`) в одной транзакции.

## 8. Авторизация

- `shared/middleware/auth-context.ts`: `request.auth.userId` = `customer_id`.
- MVP: заголовок `X-Kircraft-Customer-Id` или `AUTH_DEV_USER_ID`.
- Все запросы к заказам/платежам/корзине фильтровать по `userId` в repository (`…ForCustomer`).

## 9. Stateless

Процесс не хранит расчёт доставки в памяти: только БД (`checkout_delivery_states`) + данные из `schema.dbml`.

## 10. Порядок реализации

1. **Cart** — репозиторий PG, валидация товаров, ответы по `cart-api.md`.
2. **Delivery** — миграция checkout, `CheckoutDeliveryRepositoryPg`, `CdekService` + client.
3. **Order** — транзакция создания заказа и snapshot в `order_deliveries`.
4. **Payment** — YooKassa create + `PaymentRepositoryPg`.
5. **Webhook** — подпись YooKassa, идемпотентность, обновление заказа `paid`.

## 11. Риски

- Таблица `checkout_delivery_states` не в `schema.dbml` — нужно держать в синхроне с миграциями.
- Реальное тело webhook YooKassa может быть обёрнуто в `object` — согласовать парсинг с официальной схемой уведомлений.
- `loadConfig` требует `DATABASE_URL` при старте даже для локальных экспериментов.
