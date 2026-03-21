-- Временное состояние выбранной доставки до создания заказа (Delivery API / checkout).
-- Не описано в schema.dbml; применять вручную или через свой раннер миграций.

CREATE TABLE IF NOT EXISTS checkout_delivery_states (
  checkout_delivery_state_id varchar PRIMARY KEY,
  customer_id varchar NOT NULL REFERENCES customers(customer_id),
  cart_id varchar NOT NULL REFERENCES carts(cart_id),
  -- последний расчёт: JSON массива options + метаданные (delivery_provider, delivery_type, city)
  last_calculate_payload jsonb NOT NULL DEFAULT '{}',
  last_calculate_at timestamptz,
  -- выбранная доставка (Selected Delivery) или null
  selected_delivery jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, cart_id)
);

CREATE INDEX IF NOT EXISTS idx_checkout_delivery_cart ON checkout_delivery_states (cart_id);
