CREATE TABLE "categories" (
  "category_id" varchar PRIMARY KEY,
  "category_name" varchar NOT NULL,
  "description_short" text,
  "status" varchar NOT NULL,
  "sort_order" int,
  "internal_note" text
);

CREATE TABLE "collections" (
  "collection_id" varchar PRIMARY KEY,
  "collection_name" varchar NOT NULL,
  "description_short" text,
  "design_features" text,
  "cover_photo_path" text,
  "status" varchar NOT NULL,
  "sort_order" int,
  "internal_note" text
);

CREATE TABLE "products" (
  "product_id" varchar PRIMARY KEY,
  "product_name" varchar NOT NULL,
  "category_id" varchar NOT NULL,
  "collection_id" varchar,
  "description_short" text,
  "base_price" decimal NOT NULL,
  "status" varchar NOT NULL,
  "sort_order" int,
  "internal_note" text
);

CREATE TABLE "product_photos" (
  "product_photo_id" varchar PRIMARY KEY,
  "product_id" varchar NOT NULL,
  "photo_path" text NOT NULL,
  "is_main" boolean NOT NULL DEFAULT false,
  "sort_order" int
);

CREATE TABLE "product_parameters" (
  "parameter_id" varchar PRIMARY KEY,
  "parameter_name" varchar NOT NULL,
  "active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "product_parameter_values" (
  "parameter_value_id" varchar PRIMARY KEY,
  "parameter_id" varchar NOT NULL,
  "value_name" varchar NOT NULL,
  "sort_order" int,
  "active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "product_available_parameters" (
  "product_available_parameter_id" varchar PRIMARY KEY,
  "product_id" varchar NOT NULL,
  "parameter_id" varchar NOT NULL
);

CREATE TABLE "product_available_parameter_values" (
  "product_available_parameter_value_id" varchar PRIMARY KEY,
  "product_available_parameter_id" varchar NOT NULL,
  "parameter_value_id" varchar NOT NULL
);

CREATE TABLE "customers" (
  "customer_id" varchar PRIMARY KEY,
  "telegram_user_id" varchar,
  "telegram_username" varchar,
  "customer_name" varchar,
  "phone" varchar,
  "created_at" datetime,
  "active" boolean NOT NULL DEFAULT true,
  "internal_note" text
);

CREATE TABLE "carts" (
  "cart_id" varchar PRIMARY KEY,
  "customer_id" varchar NOT NULL,
  "status" varchar NOT NULL,
  "created_at" datetime,
  "updated_at" datetime
);

CREATE TABLE "cart_items" (
  "cart_item_id" varchar PRIMARY KEY,
  "cart_id" varchar NOT NULL,
  "product_id" varchar NOT NULL,
  "quantity" int NOT NULL DEFAULT 1
);

CREATE TABLE "cart_item_selected_values" (
  "cart_item_selected_value_id" varchar PRIMARY KEY,
  "cart_item_id" varchar NOT NULL,
  "parameter_id" varchar NOT NULL,
  "parameter_value_id" varchar NOT NULL
);

CREATE TABLE "orders" (
  "order_id" varchar PRIMARY KEY,
  "customer_id" varchar NOT NULL,
  "customer_name_snapshot" varchar NOT NULL,
  "phone_snapshot" varchar NOT NULL,
  "status" varchar NOT NULL,
  "city" varchar NOT NULL,
  "delivery_address" text NOT NULL,
  "comment" text,
  "items_total" decimal NOT NULL,
  "delivery_price" decimal,
  "total_price" decimal NOT NULL,
  "created_at" datetime,
  "updated_at" datetime
);

CREATE TABLE "order_items" (
  "order_item_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "product_id" varchar NOT NULL,
  "product_name_snapshot" varchar NOT NULL,
  "price_snapshot" decimal NOT NULL,
  "quantity" int NOT NULL DEFAULT 1
);

CREATE TABLE "order_item_selected_values" (
  "order_item_selected_value_id" varchar PRIMARY KEY,
  "order_item_id" varchar NOT NULL,
  "parameter_id" varchar NOT NULL,
  "parameter_value_id" varchar NOT NULL,
  "parameter_name_snapshot" varchar NOT NULL,
  "value_name_snapshot" varchar NOT NULL
);

CREATE TABLE "staff_users" (
  "staff_user_id" varchar PRIMARY KEY,
  "staff_name" varchar NOT NULL,
  "role" varchar NOT NULL,
  "telegram_user_id" varchar,
  "active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "order_status_history" (
  "order_status_history_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "from_status" varchar,
  "to_status" varchar NOT NULL,
  "changed_at" datetime NOT NULL,
  "changed_by_staff_user_id" varchar,
  "comment" text
);

CREATE TABLE "payments" (
  "payment_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "amount" decimal NOT NULL,
  "status" varchar NOT NULL,
  "external_payment_id" varchar,
  "paid_at" datetime,
  "created_at" datetime NOT NULL
);

COMMENT ON COLUMN "categories"."category_id" IS 'Уникальный идентификатор категории';

COMMENT ON COLUMN "categories"."category_name" IS 'Название категории';

COMMENT ON COLUMN "categories"."description_short" IS 'Краткое описание категории';

COMMENT ON COLUMN "categories"."status" IS 'Статус категории: draft/active/archived';

COMMENT ON COLUMN "categories"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "categories"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "collections"."collection_id" IS 'Уникальный идентификатор коллекции';

COMMENT ON COLUMN "collections"."collection_name" IS 'Название коллекции';

COMMENT ON COLUMN "collections"."description_short" IS 'Краткое описание коллекции';

COMMENT ON COLUMN "collections"."design_features" IS 'Ключевые особенности коллекции';

COMMENT ON COLUMN "collections"."cover_photo_path" IS 'Путь к обложке коллекции';

COMMENT ON COLUMN "collections"."status" IS 'Статус коллекции: draft/active/archived';

COMMENT ON COLUMN "collections"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "collections"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "products"."product_id" IS 'Уникальный идентификатор товара';

COMMENT ON COLUMN "products"."product_name" IS 'Название товара';

COMMENT ON COLUMN "products"."category_id" IS 'Ссылка на категорию';

COMMENT ON COLUMN "products"."collection_id" IS 'Ссылка на коллекцию, необязательная';

COMMENT ON COLUMN "products"."description_short" IS 'Краткое описание товара';

COMMENT ON COLUMN "products"."base_price" IS 'Базовая цена товара';

COMMENT ON COLUMN "products"."status" IS 'Статус товара: draft/active/archived';

COMMENT ON COLUMN "products"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "products"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "product_photos"."product_photo_id" IS 'Уникальный идентификатор фотографии товара';

COMMENT ON COLUMN "product_photos"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "product_photos"."photo_path" IS 'Путь к фотографии';

COMMENT ON COLUMN "product_photos"."is_main" IS 'Признак основной фотографии';

COMMENT ON COLUMN "product_photos"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "product_parameters"."parameter_id" IS 'Уникальный идентификатор параметра';

COMMENT ON COLUMN "product_parameters"."parameter_name" IS 'Название параметра';

COMMENT ON COLUMN "product_parameters"."active" IS 'Признак активности';

COMMENT ON COLUMN "product_parameter_values"."parameter_value_id" IS 'Уникальный идентификатор значения параметра';

COMMENT ON COLUMN "product_parameter_values"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "product_parameter_values"."value_name" IS 'Отображаемое значение';

COMMENT ON COLUMN "product_parameter_values"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "product_parameter_values"."active" IS 'Признак активности';

COMMENT ON COLUMN "product_available_parameters"."product_available_parameter_id" IS 'Уникальный идентификатор связи товара и параметра';

COMMENT ON COLUMN "product_available_parameters"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "product_available_parameters"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "product_available_parameter_values"."product_available_parameter_value_id" IS 'Уникальный идентификатор допустимого значения параметра для товара';

COMMENT ON COLUMN "product_available_parameter_values"."product_available_parameter_id" IS 'Ссылка на связь товара и параметра';

COMMENT ON COLUMN "product_available_parameter_values"."parameter_value_id" IS 'Ссылка на допустимое значение параметра';

COMMENT ON COLUMN "customers"."customer_id" IS 'Уникальный идентификатор клиента';

COMMENT ON COLUMN "customers"."telegram_user_id" IS 'Идентификатор пользователя в Telegram';

COMMENT ON COLUMN "customers"."telegram_username" IS 'Имя пользователя в Telegram';

COMMENT ON COLUMN "customers"."customer_name" IS 'Актуальное имя клиента';

COMMENT ON COLUMN "customers"."phone" IS 'Актуальный номер телефона';

COMMENT ON COLUMN "customers"."created_at" IS 'Дата создания записи';

COMMENT ON COLUMN "customers"."active" IS 'Признак активности';

COMMENT ON COLUMN "customers"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "carts"."cart_id" IS 'Уникальный идентификатор корзины';

COMMENT ON COLUMN "carts"."customer_id" IS 'Ссылка на клиента';

COMMENT ON COLUMN "carts"."status" IS 'Статус корзины: active/converted/abandoned';

COMMENT ON COLUMN "carts"."created_at" IS 'Дата создания корзины';

COMMENT ON COLUMN "carts"."updated_at" IS 'Дата последнего изменения корзины';

COMMENT ON COLUMN "cart_items"."cart_item_id" IS 'Уникальный идентификатор позиции корзины';

COMMENT ON COLUMN "cart_items"."cart_id" IS 'Ссылка на корзину';

COMMENT ON COLUMN "cart_items"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "cart_items"."quantity" IS 'Количество';

COMMENT ON COLUMN "cart_item_selected_values"."cart_item_selected_value_id" IS 'Уникальный идентификатор выбранного значения параметра в корзине';

COMMENT ON COLUMN "cart_item_selected_values"."cart_item_id" IS 'Ссылка на позицию корзины';

COMMENT ON COLUMN "cart_item_selected_values"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "cart_item_selected_values"."parameter_value_id" IS 'Ссылка на выбранное значение параметра';

COMMENT ON COLUMN "orders"."order_id" IS 'Уникальный идентификатор заказа';

COMMENT ON COLUMN "orders"."customer_id" IS 'Ссылка на клиента';

COMMENT ON COLUMN "orders"."customer_name_snapshot" IS 'Имя клиента на момент оформления заказа';

COMMENT ON COLUMN "orders"."phone_snapshot" IS 'Телефон клиента на момент оформления заказа';

COMMENT ON COLUMN "orders"."status" IS 'Статус заказа: created/confirmed/needs_clarification/paid/in_progress/shipped/cancelled';

COMMENT ON COLUMN "orders"."city" IS 'Город доставки';

COMMENT ON COLUMN "orders"."delivery_address" IS 'Адрес доставки';

COMMENT ON COLUMN "orders"."comment" IS 'Комментарий к заказу';

COMMENT ON COLUMN "orders"."items_total" IS 'Сумма товаров в заказе';

COMMENT ON COLUMN "orders"."delivery_price" IS 'Стоимость доставки';

COMMENT ON COLUMN "orders"."total_price" IS 'Итоговая сумма заказа';

COMMENT ON COLUMN "orders"."created_at" IS 'Дата создания заказа';

COMMENT ON COLUMN "orders"."updated_at" IS 'Дата последнего изменения заказа';

COMMENT ON COLUMN "order_items"."order_item_id" IS 'Уникальный идентификатор позиции заказа';

COMMENT ON COLUMN "order_items"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "order_items"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "order_items"."product_name_snapshot" IS 'Название товара на момент заказа';

COMMENT ON COLUMN "order_items"."price_snapshot" IS 'Цена товара на момент заказа';

COMMENT ON COLUMN "order_items"."quantity" IS 'Количество';

COMMENT ON COLUMN "order_item_selected_values"."order_item_selected_value_id" IS 'Уникальный идентификатор выбранного значения параметра в заказе';

COMMENT ON COLUMN "order_item_selected_values"."order_item_id" IS 'Ссылка на позицию заказа';

COMMENT ON COLUMN "order_item_selected_values"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "order_item_selected_values"."parameter_value_id" IS 'Ссылка на выбранное значение параметра';

COMMENT ON COLUMN "order_item_selected_values"."parameter_name_snapshot" IS 'Название параметра на момент заказа';

COMMENT ON COLUMN "order_item_selected_values"."value_name_snapshot" IS 'Значение параметра на момент заказа';

COMMENT ON COLUMN "staff_users"."staff_user_id" IS 'Уникальный идентификатор внутреннего пользователя';

COMMENT ON COLUMN "staff_users"."staff_name" IS 'Имя сотрудника';

COMMENT ON COLUMN "staff_users"."role" IS 'Роль: master/manager/admin';

COMMENT ON COLUMN "staff_users"."telegram_user_id" IS 'Идентификатор пользователя в Telegram';

COMMENT ON COLUMN "staff_users"."active" IS 'Признак активности';

COMMENT ON COLUMN "order_status_history"."order_status_history_id" IS 'Уникальный идентификатор записи истории статусов';

COMMENT ON COLUMN "order_status_history"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "order_status_history"."from_status" IS 'Предыдущий статус заказа';

COMMENT ON COLUMN "order_status_history"."to_status" IS 'Новый статус заказа';

COMMENT ON COLUMN "order_status_history"."changed_at" IS 'Дата и время изменения статуса';

COMMENT ON COLUMN "order_status_history"."changed_by_staff_user_id" IS 'Ссылка на внутреннего пользователя, изменившего статус';

COMMENT ON COLUMN "order_status_history"."comment" IS 'Комментарий к изменению статуса';

COMMENT ON COLUMN "payments"."payment_id" IS 'Уникальный идентификатор платежа';

COMMENT ON COLUMN "payments"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "payments"."amount" IS 'Сумма платежа';

COMMENT ON COLUMN "payments"."status" IS 'Статус платежа: pending/succeeded/failed/cancelled';

COMMENT ON COLUMN "payments"."external_payment_id" IS 'Идентификатор платежа во внешней платежной системе';

COMMENT ON COLUMN "payments"."paid_at" IS 'Дата и время успешной оплаты';

COMMENT ON COLUMN "payments"."created_at" IS 'Дата создания записи о платеже';

ALTER TABLE "products" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "products" ADD FOREIGN KEY ("collection_id") REFERENCES "collections" ("collection_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_photos" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_parameter_values" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameters" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameters" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameter_values" ADD FOREIGN KEY ("product_available_parameter_id") REFERENCES "product_available_parameters" ("product_available_parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameter_values" ADD FOREIGN KEY ("parameter_value_id") REFERENCES "product_parameter_values" ("parameter_value_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "carts" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_items" ADD FOREIGN KEY ("cart_id") REFERENCES "carts" ("cart_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_items" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_item_selected_values" ADD FOREIGN KEY ("cart_item_id") REFERENCES "cart_items" ("cart_item_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_item_selected_values" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_item_selected_values" ADD FOREIGN KEY ("parameter_value_id") REFERENCES "product_parameter_values" ("parameter_value_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "orders" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_items" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_items" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item_selected_values" ADD FOREIGN KEY ("order_item_id") REFERENCES "order_items" ("order_item_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item_selected_values" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item_selected_values" ADD FOREIGN KEY ("parameter_value_id") REFERENCES "product_parameter_values" ("parameter_value_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_history" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_history" ADD FOREIGN KEY ("changed_by_staff_user_id") REFERENCES "staff_users" ("staff_user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;
