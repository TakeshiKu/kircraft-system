CREATE TABLE "categories" (
  "category_id" varchar PRIMARY KEY,
  "category_name" varchar NOT NULL,
  "description_short" text,
  "status" varchar NOT NULL,
  "sort_order" int,
  "internal_note" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "collections" (
  "collection_id" varchar PRIMARY KEY,
  "collection_name" varchar NOT NULL,
  "description_short" text,
  "design_features" text,
  "cover_photo_path" text,
  "status" varchar NOT NULL,
  "sort_order" int,
  "internal_note" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "products" (
  "product_id" varchar PRIMARY KEY,
  "product_name" varchar NOT NULL,
  "category_id" varchar NOT NULL,
  "collection_id" varchar,
  "description_short" text,
  "base_price" bigint NOT NULL,
  "status" varchar NOT NULL,
  "sort_order" int,
  "internal_note" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "product_photos" (
  "product_photo_id" varchar PRIMARY KEY,
  "product_id" varchar NOT NULL,
  "photo_path" text NOT NULL,
  "is_main" boolean NOT NULL DEFAULT false,
  "sort_order" int,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "product_parameters" (
  "parameter_id" varchar PRIMARY KEY,
  "parameter_name" varchar NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "product_parameter_values" (
  "parameter_value_id" varchar PRIMARY KEY,
  "parameter_id" varchar NOT NULL,
  "value_name" varchar NOT NULL,
  "sort_order" int,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "product_available_parameters" (
  "product_available_parameter_id" varchar PRIMARY KEY,
  "product_id" varchar NOT NULL,
  "parameter_id" varchar NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "product_available_parameter_values" (
  "product_available_parameter_value_id" varchar PRIMARY KEY,
  "product_available_parameter_id" varchar NOT NULL,
  "parameter_value_id" varchar NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "customers" (
  "customer_id" varchar PRIMARY KEY,
  "customer_name" varchar,
  "phone" varchar,
  "email" varchar,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "internal_note" text
);

CREATE TABLE "customer_external_accounts" (
  "customer_external_account_id" varchar PRIMARY KEY,
  "customer_id" varchar NOT NULL,
  "provider" varchar NOT NULL,
  "external_user_id" varchar NOT NULL,
  "external_username" varchar,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "carts" (
  "cart_id" varchar PRIMARY KEY,
  "customer_id" varchar NOT NULL,
  "status" varchar NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "cart_items" (
  "cart_item_id" varchar PRIMARY KEY,
  "cart_id" varchar NOT NULL,
  "product_id" varchar NOT NULL,
  "quantity" int NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "cart_item_selected_values" (
  "cart_item_selected_value_id" varchar PRIMARY KEY,
  "cart_item_id" varchar NOT NULL,
  "parameter_id" varchar NOT NULL,
  "parameter_value_id" varchar NOT NULL,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "orders" (
  "order_id" varchar PRIMARY KEY,
  "customer_id" varchar NOT NULL,
  "cart_id" varchar,
  "source_channel" varchar,
  "customer_name_snapshot" varchar NOT NULL,
  "phone_snapshot" varchar NOT NULL,
  "email_snapshot" varchar,
  "status" varchar NOT NULL,
  "city" varchar NOT NULL,
  "delivery_address" text,
  "comment" text,
  "items_total" bigint NOT NULL,
  "delivery_price" bigint NOT NULL DEFAULT 0,
  "total_price" bigint NOT NULL,
  "paid_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "order_items" (
  "order_item_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "product_id" varchar NOT NULL,
  "product_name_snapshot" varchar NOT NULL,
  "price_snapshot" bigint NOT NULL,
  "quantity" int NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "order_item_selected_values" (
  "order_item_selected_value_id" varchar PRIMARY KEY,
  "order_item_id" varchar NOT NULL,
  "parameter_id" varchar NOT NULL,
  "parameter_value_id" varchar NOT NULL,
  "parameter_name_snapshot" varchar NOT NULL,
  "value_name_snapshot" varchar NOT NULL,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "order_deliveries" (
  "order_delivery_id" varchar PRIMARY KEY,
  "order_id" varchar UNIQUE NOT NULL,
  "delivery_provider" varchar NOT NULL,
  "delivery_type" varchar NOT NULL,
  "status" varchar NOT NULL,
  "city" varchar NOT NULL,
  "pickup_point_id" varchar,
  "pickup_point_name" varchar,
  "pickup_point_address" text,
  "delivery_eta_min_days" int,
  "delivery_eta_max_days" int,
  "delivery_price" bigint NOT NULL DEFAULT 0,
  "delivery_currency" char(3) NOT NULL DEFAULT 'RUB',
  "provider_payload" text,
  "calculated_at" timestamp,
  "confirmed_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "order_clarifications" (
  "order_clarification_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "requested_by_staff_user_id" varchar,
  "clarification_type" varchar NOT NULL,
  "comment" text NOT NULL,
  "status" varchar NOT NULL,
  "created_at" timestamp NOT NULL,
  "resolved_at" timestamp
);

CREATE TABLE "staff_users" (
  "staff_user_id" varchar PRIMARY KEY,
  "staff_name" varchar NOT NULL,
  "role" varchar NOT NULL,
  "telegram_user_id" varchar,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "order_status_history" (
  "order_status_history_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "from_status" varchar,
  "to_status" varchar NOT NULL,
  "changed_at" timestamp NOT NULL,
  "changed_by_staff_user_id" varchar,
  "comment" text
);

CREATE TABLE "payments" (
  "payment_id" varchar PRIMARY KEY,
  "order_id" varchar NOT NULL,
  "customer_id" varchar NOT NULL,
  "amount" bigint NOT NULL,
  "currency" char(3) NOT NULL,
  "status" varchar NOT NULL,
  "provider_status" varchar,
  "provider_paid" boolean NOT NULL DEFAULT false,
  "external_payment_id" varchar,
  "idempotence_key" varchar NOT NULL,
  "description" varchar,
  "confirmation_type" varchar,
  "return_url" text,
  "confirmation_url" text,
  "provider_metadata" text,
  "cancellation_details" text,
  "captured_at" timestamp,
  "expires_at" timestamp,
  "paid_at" timestamp,
  "payment_attempt_id" varchar UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "last_status_check_at" timestamp,
  "last_webhook_at" timestamp,
  "last_status_source" varchar,
  "provider_response_raw" text
);

COMMENT ON COLUMN "categories"."category_id" IS 'Уникальный идентификатор категории';

COMMENT ON COLUMN "categories"."category_name" IS 'Название категории';

COMMENT ON COLUMN "categories"."description_short" IS 'Краткое описание категории';

COMMENT ON COLUMN "categories"."status" IS 'Статус категории: draft/active/archived';

COMMENT ON COLUMN "categories"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "categories"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "categories"."created_at" IS 'Дата создания категории';

COMMENT ON COLUMN "categories"."updated_at" IS 'Дата последнего изменения категории';

COMMENT ON COLUMN "collections"."collection_id" IS 'Уникальный идентификатор коллекции';

COMMENT ON COLUMN "collections"."collection_name" IS 'Название коллекции';

COMMENT ON COLUMN "collections"."description_short" IS 'Краткое описание коллекции';

COMMENT ON COLUMN "collections"."design_features" IS 'Ключевые особенности коллекции';

COMMENT ON COLUMN "collections"."cover_photo_path" IS 'Путь к обложке коллекции';

COMMENT ON COLUMN "collections"."status" IS 'Статус коллекции: draft/active/archived';

COMMENT ON COLUMN "collections"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "collections"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "collections"."created_at" IS 'Дата создания коллекции';

COMMENT ON COLUMN "collections"."updated_at" IS 'Дата последнего изменения коллекции';

COMMENT ON COLUMN "products"."product_id" IS 'Уникальный идентификатор товара';

COMMENT ON COLUMN "products"."product_name" IS 'Название товара';

COMMENT ON COLUMN "products"."category_id" IS 'Ссылка на категорию';

COMMENT ON COLUMN "products"."collection_id" IS 'Ссылка на коллекцию, необязательная';

COMMENT ON COLUMN "products"."description_short" IS 'Краткое описание товара';

COMMENT ON COLUMN "products"."base_price" IS 'Базовая цена товара';

COMMENT ON COLUMN "products"."status" IS 'Статус товара: draft/active/archived';

COMMENT ON COLUMN "products"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "products"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "products"."created_at" IS 'Дата создания товара';

COMMENT ON COLUMN "products"."updated_at" IS 'Дата последнего изменения товара';

COMMENT ON COLUMN "product_photos"."product_photo_id" IS 'Уникальный идентификатор фотографии товара';

COMMENT ON COLUMN "product_photos"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "product_photos"."photo_path" IS 'Путь к фотографии';

COMMENT ON COLUMN "product_photos"."is_main" IS 'Признак основной фотографии';

COMMENT ON COLUMN "product_photos"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "product_photos"."created_at" IS 'Дата добавления фотографии';

COMMENT ON COLUMN "product_photos"."updated_at" IS 'Дата последнего изменения фотографии';

COMMENT ON COLUMN "product_parameters"."parameter_id" IS 'Уникальный идентификатор параметра';

COMMENT ON COLUMN "product_parameters"."parameter_name" IS 'Название параметра';

COMMENT ON COLUMN "product_parameters"."active" IS 'Признак активности';

COMMENT ON COLUMN "product_parameters"."created_at" IS 'Дата создания параметра';

COMMENT ON COLUMN "product_parameters"."updated_at" IS 'Дата последнего изменения параметра';

COMMENT ON COLUMN "product_parameter_values"."parameter_value_id" IS 'Уникальный идентификатор значения параметра';

COMMENT ON COLUMN "product_parameter_values"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "product_parameter_values"."value_name" IS 'Отображаемое значение';

COMMENT ON COLUMN "product_parameter_values"."sort_order" IS 'Порядок отображения';

COMMENT ON COLUMN "product_parameter_values"."active" IS 'Признак активности';

COMMENT ON COLUMN "product_parameter_values"."created_at" IS 'Дата создания значения параметра';

COMMENT ON COLUMN "product_parameter_values"."updated_at" IS 'Дата последнего изменения значения параметра';

COMMENT ON COLUMN "product_available_parameters"."product_available_parameter_id" IS 'Уникальный идентификатор связи товара и параметра';

COMMENT ON COLUMN "product_available_parameters"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "product_available_parameters"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "product_available_parameters"."created_at" IS 'Дата создания связи товара и параметра';

COMMENT ON COLUMN "product_available_parameters"."updated_at" IS 'Дата последнего изменения связи товара и параметра';

COMMENT ON COLUMN "product_available_parameter_values"."product_available_parameter_value_id" IS 'Уникальный идентификатор допустимого значения параметра для товара';

COMMENT ON COLUMN "product_available_parameter_values"."product_available_parameter_id" IS 'Ссылка на связь товара и параметра';

COMMENT ON COLUMN "product_available_parameter_values"."parameter_value_id" IS 'Ссылка на допустимое значение параметра';

COMMENT ON COLUMN "product_available_parameter_values"."created_at" IS 'Дата создания допустимого значения параметра для товара';

COMMENT ON COLUMN "product_available_parameter_values"."updated_at" IS 'Дата последнего изменения допустимого значения параметра для товара';

COMMENT ON COLUMN "customers"."customer_id" IS 'Уникальный внутренний идентификатор клиента';

COMMENT ON COLUMN "customers"."customer_name" IS 'Актуальное имя клиента';

COMMENT ON COLUMN "customers"."phone" IS 'Актуальный номер телефона';

COMMENT ON COLUMN "customers"."email" IS 'Актуальный email клиента (необязательное поле)';

COMMENT ON COLUMN "customers"."created_at" IS 'Дата создания записи клиента';

COMMENT ON COLUMN "customers"."updated_at" IS 'Дата последнего изменения записи клиента';

COMMENT ON COLUMN "customers"."active" IS 'Признак активности клиента';

COMMENT ON COLUMN "customers"."internal_note" IS 'Внутренняя заметка';

COMMENT ON COLUMN "customer_external_accounts"."customer_external_account_id" IS 'Уникальный идентификатор внешней учетной записи клиента';

COMMENT ON COLUMN "customer_external_accounts"."customer_id" IS 'Ссылка на клиента';

COMMENT ON COLUMN "customer_external_accounts"."provider" IS 'Канал идентификации клиента: telegram/web/mini_app/max/vk/other';

COMMENT ON COLUMN "customer_external_accounts"."external_user_id" IS 'Идентификатор пользователя во внешнем канале';

COMMENT ON COLUMN "customer_external_accounts"."external_username" IS 'Имя пользователя, логин или ник во внешнем канале';

COMMENT ON COLUMN "customer_external_accounts"."is_primary" IS 'Признак основной учетной записи клиента в канале';

COMMENT ON COLUMN "customer_external_accounts"."created_at" IS 'Дата создания внешней учетной записи';

COMMENT ON COLUMN "customer_external_accounts"."updated_at" IS 'Дата последнего изменения внешней учетной записи';

COMMENT ON COLUMN "customer_external_accounts"."active" IS 'Признак активности внешней учетной записи';

COMMENT ON COLUMN "carts"."cart_id" IS 'Уникальный идентификатор корзины';

COMMENT ON COLUMN "carts"."customer_id" IS 'Ссылка на клиента';

COMMENT ON COLUMN "carts"."status" IS 'Статус корзины: active/converted/abandoned';

COMMENT ON COLUMN "carts"."created_at" IS 'Дата создания корзины';

COMMENT ON COLUMN "carts"."updated_at" IS 'Дата последнего изменения корзины';

COMMENT ON COLUMN "cart_items"."cart_item_id" IS 'Уникальный идентификатор позиции корзины';

COMMENT ON COLUMN "cart_items"."cart_id" IS 'Ссылка на корзину';

COMMENT ON COLUMN "cart_items"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "cart_items"."quantity" IS 'Количество';

COMMENT ON COLUMN "cart_items"."created_at" IS 'Дата добавления товара в корзину';

COMMENT ON COLUMN "cart_item_selected_values"."cart_item_selected_value_id" IS 'Уникальный идентификатор выбранного значения параметра в корзине';

COMMENT ON COLUMN "cart_item_selected_values"."cart_item_id" IS 'Ссылка на позицию корзины';

COMMENT ON COLUMN "cart_item_selected_values"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "cart_item_selected_values"."parameter_value_id" IS 'Ссылка на выбранное значение параметра';

COMMENT ON COLUMN "cart_item_selected_values"."created_at" IS 'Дата выбора значения параметра';

COMMENT ON COLUMN "orders"."order_id" IS 'Уникальный идентификатор заказа';

COMMENT ON COLUMN "orders"."customer_id" IS 'Ссылка на клиента';

COMMENT ON COLUMN "orders"."cart_id" IS 'Ссылка на корзину, из которой был создан заказ';

COMMENT ON COLUMN "orders"."source_channel" IS 'Канал создания заказа: telegram/web/mini_app/max/vk/other';

COMMENT ON COLUMN "orders"."customer_name_snapshot" IS 'Имя клиента на момент оформления заказа';

COMMENT ON COLUMN "orders"."phone_snapshot" IS 'Телефон клиента на момент оформления заказа';

COMMENT ON COLUMN "orders"."email_snapshot" IS 'Email клиента на момент оформления заказа (необязательное поле)';

COMMENT ON COLUMN "orders"."status" IS 'Статус заказа: created/awaiting_payment/needs_clarification/paid/in_progress/shipped/cancelled/rejected';

COMMENT ON COLUMN "orders"."city" IS 'Город доставки (snapshot)';

COMMENT ON COLUMN "orders"."delivery_address" IS 'Адрес доставки (legacy/snapshot, необязателен)';

COMMENT ON COLUMN "orders"."comment" IS 'Комментарий к заказу';

COMMENT ON COLUMN "orders"."items_total" IS 'Сумма товаров в заказе';

COMMENT ON COLUMN "orders"."delivery_price" IS 'Стоимость доставки (snapshot, дублирует order_deliveries)';

COMMENT ON COLUMN "orders"."total_price" IS 'Итоговая сумма заказа (items + delivery)';

COMMENT ON COLUMN "orders"."paid_at" IS 'Дата и время подтвержденной успешной оплаты заказа';

COMMENT ON COLUMN "orders"."created_at" IS 'Дата создания заказа';

COMMENT ON COLUMN "orders"."updated_at" IS 'Дата последнего изменения заказа';

COMMENT ON COLUMN "order_items"."order_item_id" IS 'Уникальный идентификатор позиции заказа';

COMMENT ON COLUMN "order_items"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "order_items"."product_id" IS 'Ссылка на товар';

COMMENT ON COLUMN "order_items"."product_name_snapshot" IS 'Название товара на момент заказа';

COMMENT ON COLUMN "order_items"."price_snapshot" IS 'Цена товара за единицу на момент заказа';

COMMENT ON COLUMN "order_items"."quantity" IS 'Количество';

COMMENT ON COLUMN "order_items"."created_at" IS 'Дата создания позиции заказа';

COMMENT ON COLUMN "order_item_selected_values"."order_item_selected_value_id" IS 'Уникальный идентификатор выбранного значения параметра в заказе';

COMMENT ON COLUMN "order_item_selected_values"."order_item_id" IS 'Ссылка на позицию заказа';

COMMENT ON COLUMN "order_item_selected_values"."parameter_id" IS 'Ссылка на параметр';

COMMENT ON COLUMN "order_item_selected_values"."parameter_value_id" IS 'Ссылка на выбранное значение параметра';

COMMENT ON COLUMN "order_item_selected_values"."parameter_name_snapshot" IS 'Название параметра на момент заказа';

COMMENT ON COLUMN "order_item_selected_values"."value_name_snapshot" IS 'Значение параметра на момент заказа';

COMMENT ON COLUMN "order_item_selected_values"."created_at" IS 'Дата фиксации выбранного значения параметра в заказе';

COMMENT ON COLUMN "order_deliveries"."order_delivery_id" IS 'Уникальный идентификатор доставки заказа';

COMMENT ON COLUMN "order_deliveries"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "order_deliveries"."delivery_provider" IS 'Провайдер доставки: cdek/other';

COMMENT ON COLUMN "order_deliveries"."delivery_type" IS 'Тип доставки: pickup_point/courier/other';

COMMENT ON COLUMN "order_deliveries"."status" IS 'Статус доставки: calculated/confirmed/needs_clarification/cancelled';

COMMENT ON COLUMN "order_deliveries"."city" IS 'Город доставки';

COMMENT ON COLUMN "order_deliveries"."pickup_point_id" IS 'Идентификатор ПВЗ во внешней системе';

COMMENT ON COLUMN "order_deliveries"."pickup_point_name" IS 'Название ПВЗ';

COMMENT ON COLUMN "order_deliveries"."pickup_point_address" IS 'Адрес ПВЗ';

COMMENT ON COLUMN "order_deliveries"."delivery_eta_min_days" IS 'Минимальный срок доставки в днях';

COMMENT ON COLUMN "order_deliveries"."delivery_eta_max_days" IS 'Максимальный срок доставки в днях';

COMMENT ON COLUMN "order_deliveries"."delivery_price" IS 'Стоимость доставки';

COMMENT ON COLUMN "order_deliveries"."delivery_currency" IS 'Валюта доставки';

COMMENT ON COLUMN "order_deliveries"."provider_payload" IS 'Сырой или нормализованный ответ провайдера доставки';

COMMENT ON COLUMN "order_deliveries"."calculated_at" IS 'Дата и время расчета доставки';

COMMENT ON COLUMN "order_deliveries"."confirmed_at" IS 'Дата и время фиксации доставки в заказе';

COMMENT ON COLUMN "order_deliveries"."created_at" IS 'Дата создания записи доставки';

COMMENT ON COLUMN "order_deliveries"."updated_at" IS 'Дата последнего изменения записи доставки';

COMMENT ON COLUMN "order_clarifications"."order_clarification_id" IS 'Уникальный идентификатор запроса на уточнение';

COMMENT ON COLUMN "order_clarifications"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "order_clarifications"."requested_by_staff_user_id" IS 'Кто запросил уточнение';

COMMENT ON COLUMN "order_clarifications"."clarification_type" IS 'Тип уточнения: product_params/delivery/contact/other';

COMMENT ON COLUMN "order_clarifications"."comment" IS 'Текст уточнения';

COMMENT ON COLUMN "order_clarifications"."status" IS 'Статус уточнения: open/resolved/cancelled';

COMMENT ON COLUMN "order_clarifications"."created_at" IS 'Дата создания запроса';

COMMENT ON COLUMN "order_clarifications"."resolved_at" IS 'Дата закрытия запроса';

COMMENT ON COLUMN "staff_users"."staff_user_id" IS 'Уникальный идентификатор внутреннего пользователя';

COMMENT ON COLUMN "staff_users"."staff_name" IS 'Имя сотрудника';

COMMENT ON COLUMN "staff_users"."role" IS 'Роль: master/manager/admin';

COMMENT ON COLUMN "staff_users"."telegram_user_id" IS 'Идентификатор пользователя в Telegram';

COMMENT ON COLUMN "staff_users"."active" IS 'Признак активности';

COMMENT ON COLUMN "staff_users"."created_at" IS 'Дата создания пользователя';

COMMENT ON COLUMN "staff_users"."updated_at" IS 'Дата последнего изменения пользователя';

COMMENT ON COLUMN "order_status_history"."order_status_history_id" IS 'Уникальный идентификатор записи истории статусов';

COMMENT ON COLUMN "order_status_history"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "order_status_history"."from_status" IS 'Предыдущий статус заказа';

COMMENT ON COLUMN "order_status_history"."to_status" IS 'Новый статус заказа';

COMMENT ON COLUMN "order_status_history"."changed_at" IS 'Дата и время изменения статуса';

COMMENT ON COLUMN "order_status_history"."changed_by_staff_user_id" IS 'Ссылка на внутреннего пользователя, изменившего статус';

COMMENT ON COLUMN "order_status_history"."comment" IS 'Комментарий к изменению статуса';

COMMENT ON COLUMN "payments"."payment_id" IS 'Технический первичный ключ записи платежа в Kircraft';

COMMENT ON COLUMN "payments"."order_id" IS 'Ссылка на заказ';

COMMENT ON COLUMN "payments"."customer_id" IS 'Ссылка на клиента, инициировавшего оплату';

COMMENT ON COLUMN "payments"."amount" IS 'Итоговая сумма платежа, включая стоимость товаров и доставки';

COMMENT ON COLUMN "payments"."currency" IS 'Код валюты ISO 4217, например RUB';

COMMENT ON COLUMN "payments"."status" IS 'Внутренний статус попытки оплаты: created/pending/succeeded/canceled/error';

COMMENT ON COLUMN "payments"."provider_status" IS 'Статус платежа в YooKassa';

COMMENT ON COLUMN "payments"."provider_paid" IS 'Флаг paid из YooKassa';

COMMENT ON COLUMN "payments"."external_payment_id" IS 'Идентификатор платежа в YooKassa';

COMMENT ON COLUMN "payments"."idempotence_key" IS 'Ключ идемпотентности запроса POST /payments';

COMMENT ON COLUMN "payments"."description" IS 'Описание платежа';

COMMENT ON COLUMN "payments"."confirmation_type" IS 'Тип подтверждения платежа';

COMMENT ON COLUMN "payments"."return_url" IS 'URL возврата пользователя после оплаты';

COMMENT ON COLUMN "payments"."confirmation_url" IS 'URL страницы оплаты из YooKassa';

COMMENT ON COLUMN "payments"."provider_metadata" IS 'Metadata YooKassa';

COMMENT ON COLUMN "payments"."cancellation_details" IS 'Детали отмены платежа';

COMMENT ON COLUMN "payments"."captured_at" IS 'Время подтверждения платежа в YooKassa';

COMMENT ON COLUMN "payments"."expires_at" IS 'Время истечения платежа';

COMMENT ON COLUMN "payments"."paid_at" IS 'Внутреннее время признания оплаты успешной';

COMMENT ON COLUMN "payments"."payment_attempt_id" IS 'Бизнес-идентификатор попытки оплаты, общий для внутренней логики и передачи в metadata YooKassa';

COMMENT ON COLUMN "payments"."created_at" IS 'Дата создания записи';

COMMENT ON COLUMN "payments"."updated_at" IS 'Дата последнего обновления';

COMMENT ON COLUMN "payments"."last_status_check_at" IS 'Время последней проверки статуса';

COMMENT ON COLUMN "payments"."last_webhook_at" IS 'Время последнего webhook';

COMMENT ON COLUMN "payments"."last_status_source" IS 'Источник обновления статуса';

COMMENT ON COLUMN "payments"."provider_response_raw" IS 'Сырой ответ YooKassa';

ALTER TABLE "products" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "products" ADD FOREIGN KEY ("collection_id") REFERENCES "collections" ("collection_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_photos" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_parameter_values" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameters" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameters" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameter_values" ADD FOREIGN KEY ("product_available_parameter_id") REFERENCES "product_available_parameters" ("product_available_parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "product_available_parameter_values" ADD FOREIGN KEY ("parameter_value_id") REFERENCES "product_parameter_values" ("parameter_value_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "carts" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "customer_external_accounts" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_items" ADD FOREIGN KEY ("cart_id") REFERENCES "carts" ("cart_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_items" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_item_selected_values" ADD FOREIGN KEY ("cart_item_id") REFERENCES "cart_items" ("cart_item_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_item_selected_values" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "cart_item_selected_values" ADD FOREIGN KEY ("parameter_value_id") REFERENCES "product_parameter_values" ("parameter_value_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "orders" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "orders" ADD FOREIGN KEY ("cart_id") REFERENCES "carts" ("cart_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_items" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_items" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("product_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item_selected_values" ADD FOREIGN KEY ("order_item_id") REFERENCES "order_items" ("order_item_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item_selected_values" ADD FOREIGN KEY ("parameter_id") REFERENCES "product_parameters" ("parameter_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item_selected_values" ADD FOREIGN KEY ("parameter_value_id") REFERENCES "product_parameter_values" ("parameter_value_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_deliveries" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_clarifications" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_clarifications" ADD FOREIGN KEY ("requested_by_staff_user_id") REFERENCES "staff_users" ("staff_user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_history" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_history" ADD FOREIGN KEY ("changed_by_staff_user_id") REFERENCES "staff_users" ("staff_user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("order_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") DEFERRABLE INITIALLY IMMEDIATE;
