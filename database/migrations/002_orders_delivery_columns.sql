-- Выбранная доставка на заказе (MVP): колонки на `orders` для PATCH /api/v1/order/delivery
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_provider varchar;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type varchar;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_currency varchar;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_point_id varchar;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_point_name varchar;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_point_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_eta_min_days integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_eta_max_days integer;
