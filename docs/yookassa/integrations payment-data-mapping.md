

Для Kircraft в первой версии интеграции логично считать базовыми такие поля YooKassa:
	•	id
	•	status
	•	amount.value
	•	amount.currency
	•	description
	•	created_at
	•	paid
	•	refundable
	•	test
	•	metadata
	•	confirmation.confirmation_url
	•	payment_method.type
	•	captured_at
	•	expires_at
	•	cancellation_details

  Что сохранять в БД после создания платежа минимум
  Минимально:
	•	внутренний id платежа
	•	order_id
	•	yookassa_payment_id
	•	status
	•	amount_value
	•	amount_currency
	•	description
	•	confirmation_url
	•	paid
	•	refundable
	•	test
	•	created_at
	•	raw_response


# YooKassa → Kircraft Mapping

| YooKassa field | Kircraft field | Notes |
|---|---|---|
id | yookassa_payment_id | внешний id |
amount.value | amount_value | |
amount.currency | amount_currency | |
description | description | |
confirmation.confirmation_url | confirmation_url | |
created_at | created_at | |
paid | paid | |
refundable | refundable | |
test | test | |
metadata.order_id | order_id | |
metadata.user_id | user_id | |
