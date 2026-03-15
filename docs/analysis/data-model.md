# Модель данных системы Kircraft

## Назначение

Модель данных системы Kircraft описывает структуру хранения данных
для каталога изделий, параметров товаров, клиентских учетных записей,
корзины, заказов и оплат.

Модель ориентирована на поддержку нескольких клиентских интерфейсов:

- Telegram-бот
- Web-интерфейс
- Telegram Mini App
- другие каналы в будущем

Физическая структура базы данных описана в файле:

`database/schema.dbml`

---

## Основные доменные области

Модель данных разделена на следующие функциональные области:

1. Каталог изделий
2. Параметры товаров
3. Клиенты и внешние учетные записи
4. Корзина
5. Заказы
6. Внутренние пользователи
7. Платежи

---

## Каталог изделий

### Category

Категория товаров каталога.

Используется для группировки изделий по типу.

Примеры:
- визитницы
- обложки для паспорта
- кошельки

Одна категория может содержать несколько товаров.

Связи:

Category → Product (1:N)

### Collection

Коллекция товаров.

Коллекция объединяет изделия по серии, стилю
или дизайнерской концепции.

Одна коллекция может содержать несколько товаров.

Связи:

Collection → Product (1:N)

### Product

Основная сущность каталога.

Содержит базовую информацию о товаре:

- название
- краткое описание
- базовую цену
- принадлежность к категории
- принадлежность к коллекции

Товар может иметь несколько фотографий
и набор доступных параметров.

Связи:

Product → Category  
Product → Collection  
Product → ProductPhoto  
Product → ProductAvailableParameter  
Product → CartItem  
Product → OrderItem

### ProductPhoto

Фотографии товара.

У одного товара может быть несколько фотографий.
Одна из них может быть основной.

Связи:

ProductPhoto → Product

---

## Параметры товаров

### ProductParameter

Тип параметра товара.

Примеры:
- цвет
- тип фурнитуры

Используется как справочник параметров,
которые могут быть применены к товарам.

Связи:

ProductParameter → ProductParameterValue  
ProductParameter → ProductAvailableParameter  
ProductParameter → CartItemSelectedValue  
ProductParameter → OrderItemSelectedValue

### ProductParameterValue

Возможное значение параметра.

Например:

Параметр: цвет  
Значения:
- черный
- коричневый
- коньячный

Связи:

ProductParameterValue → ProductParameter  
ProductParameterValue → ProductAvailableParameterValue  
ProductParameterValue → CartItemSelectedValue  
ProductParameterValue → OrderItemSelectedValue

### ProductAvailableParameter

Связь товара и параметра.

Позволяет определить,
какие параметры доступны для конкретного товара.

Пример:

Товар: визитница  
Параметры:
- цвет
- фурнитура

Связи:

ProductAvailableParameter → Product  
ProductAvailableParameter → ProductParameter  
ProductAvailableParameter → ProductAvailableParameterValue

### ProductAvailableParameterValue

Допустимое значение параметра для конкретного товара.

Позволяет ограничить набор доступных значений параметра
в рамках конкретного товара.

Пример:

Товар: визитница  
Параметр: цвет  
Допустимые значения:
- черный
- коричневый

Связи:

ProductAvailableParameterValue → ProductAvailableParameter  
ProductAvailableParameterValue → ProductParameterValue

---

## Клиенты

### Customer

Клиент системы.

Это базовая сущность клиента Kircraft,
не привязанная к конкретному интерфейсу.

Содержит основную информацию о пользователе:

- имя
- телефон
- служебную заметку

Один клиент может иметь:

- несколько внешних учетных записей
- несколько корзин во времени
- несколько заказов
- несколько попыток оплаты

Связи:

Customer → CustomerExternalAccount  
Customer → Cart  
Customer → Order  
Customer → Payment

### CustomerExternalAccount

Внешняя учетная запись клиента в конкретном канале.

Примеры каналов:
- telegram
- web
- mini_app
- max
- other

Позволяет связать одного клиента с несколькими каналами
взаимодействия и идентификации.

Связи:

CustomerExternalAccount → Customer

---

## Корзина

### Cart

Корзина клиента.

Используется для хранения выбранных товаров
до оформления заказа.

Один клиент может иметь несколько корзин во времени,
например:
- активную корзину
- ранее оформленные корзины
- брошенные корзины

Корзина может быть источником для создания заказа.

Связи:

Cart → Customer  
Cart → CartItem  
Cart → Order

### CartItem

Позиция товара в корзине.

Содержит ссылку на товар
и количество выбранных единиц.

Связи:

CartItem → Cart  
CartItem → Product  
CartItem → CartItemSelectedValue

### CartItemSelectedValue

Выбранное значение параметра товара в корзине.

Используется для фиксации пользовательского выбора
до оформления заказа.

Примеры:
- выбранный цвет
- выбранный тип фурнитуры

Связи:

CartItemSelectedValue → CartItem  
CartItemSelectedValue → ProductParameter  
CartItemSelectedValue → ProductParameterValue

---

## Заказы

### Order

Заказ клиента.

Содержит:

- ссылку на клиента
- ссылку на корзину, если заказ создан из корзины
- канал создания заказа
- snapshot-данные клиента
- адрес доставки
- статус заказа
- стоимость товаров
- стоимость доставки
- итоговую стоимость
- дату подтвержденной оплаты

Заказ является самостоятельной сущностью
и хранит собственное состояние независимо от корзины.

В заказе используются snapshot-поля,
чтобы сохранить состояние данных на момент оформления.

Связи:

Order → Customer  
Order → Cart  
Order → OrderItem  
Order → OrderStatusHistory  
Order → Payment

### OrderItem

Позиция товара в заказе.

Содержит snapshot-данные:

- название товара на момент заказа
- цену товара на момент заказа

Это необходимо для сохранения исторической корректности,
даже если каталог изменится после оформления заказа.

Связи:

OrderItem → Order  
OrderItem → Product  
OrderItem → OrderItemSelectedValue

### OrderItemSelectedValue

Выбранное значение параметра товара,
зафиксированное в составе заказа.

Содержит snapshot-данные параметров,
чтобы заказ сохранял исторически корректный состав.

Примеры:
- цвет изделия
- тип фурнитуры

Связи:

OrderItemSelectedValue → OrderItem  
OrderItemSelectedValue → ProductParameter  
OrderItemSelectedValue → ProductParameterValue

---

## Внутренние пользователи

### StaffUser

Внутренний пользователь системы.

Используется для работы с заказами
и фиксации действий сотрудников.

Примеры ролей:
- master
- manager
- admin

Связи:

StaffUser → OrderStatusHistory

---

## История статусов заказов

### OrderStatusHistory

История изменений статусов заказа.

Позволяет отслеживать жизненный цикл заказа
и фиксировать факт изменения состояния.

Запись истории может содержать:

- предыдущий статус
- новый статус
- дату и время изменения
- сотрудника, изменившего статус
- комментарий

Связи:

OrderStatusHistory → Order  
OrderStatusHistory → StaffUser

---

## Платежи

### Payment

Попытка оплаты заказа.

Одна запись Payment соответствует одной попытке оплаты.

Платежи обрабатываются через внешнего провайдера
YooKassa.

Сущность хранит:

- ссылку на заказ
- ссылку на клиента
- сумму и валюту платежа
- внутренний статус попытки оплаты
- статус платежа у провайдера
- внешний идентификатор платежа
- ключ идемпотентности
- данные redirect-сценария
- технические данные для синхронизации статуса
- диагностические данные по интеграции

Один заказ может иметь несколько попыток оплаты.

Статус заказа и статус платежа хранятся раздельно.
Это позволяет корректно обрабатывать:
- повторные попытки оплаты
- отмененные оплаты
- webhook-события
- fallback-проверки через API провайдера

Связи:

Payment → Order  
Payment → Customer

---

## Общая структура модели

```text
Category
└── Product

Collection
└── Product

Customer
├── CustomerExternalAccount
├── Cart
│   └── CartItem
│       └── CartItemSelectedValue
├── Order
│   ├── OrderItem
│   │   └── OrderItemSelectedValue
│   ├── Payment
│   └── OrderStatusHistory
└── Payment

Product
├── ProductPhoto
├── CartItem
├── OrderItem
└── ProductAvailableParameter
    └── ProductAvailableParameterValue

ProductParameter
├── ProductParameterValue
├── ProductAvailableParameter
├── CartItemSelectedValue
└── OrderItemSelectedValue

StaffUser
└── OrderStatusHistory
