# Модель данных системы Kircraft

## Назначение

Модель данных системы Kircraft описывает структуру хранения данных
для каталога изделий, корзины пользователя, оформления заказов и обработки оплат.

Модель ориентирована на поддержку нескольких клиентских интерфейсов:

- Telegram-бот
- Web-интерфейс
- Telegram Mini App
- другие каналы в будущем

Физическая структура базы данных описана в файле:

`database/schema.dbml`

---

## Основные доменные области

Модель данных разделена на несколько функциональных областей:

1. Каталог изделий
2. Параметры товаров
3. Клиенты и их внешние учетные записи
4. Корзина
5. Заказы
6. Внутренние пользователи
7. Платежи

---

## Каталог изделий

### Category

Категория товаров каталога.

Примеры:
- визитницы
- обложки для паспорта
- кошельки

Одна категория может содержать несколько товаров.

Связи:

Category → Product (1:N)

### Collection

Коллекция товаров.

Коллекция объединяет изделия по дизайнерской концепции
или серии.

Связи:

Collection → Product (1:N)

### Product

Основная сущность каталога.

Содержит базовую информацию о товаре:

- название
- описание
- базовую цену
- принадлежность к категории
- принадлежность к коллекции

Товар может иметь несколько фотографий и набор доступных параметров.

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
Одна из них может быть отмечена как основная.

Связи:

ProductPhoto → Product

---

## Параметры товаров

### ProductParameter

Тип параметра товара.

Примеры:
- цвет
- тип фурнитуры
- материал

Связи:

ProductParameter → ProductParameterValue  
ProductParameter → ProductAvailableParameter

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

### ProductAvailableParameter

Связь товара и параметра.

Позволяет определить,
какие параметры применимы к конкретному товару.

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

Определяет допустимые значения параметров для конкретного товара.

Например:

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

Это базовая сущность клиента Kircraft, не привязанная
к конкретному клиентскому интерфейсу.

Содержит основную информацию о пользователе:

- имя
- телефон
- служебные заметки

Один клиент может иметь несколько заказов, несколько корзин
и несколько внешних учетных записей.

Связи:

Customer → Order  
Customer → Cart  
Customer → CustomerExternalAccount  
Customer → Payment

### CustomerExternalAccount

Внешняя учетная запись клиента в конкретном канале.

Примеры каналов:
- telegram
- web
- mini_app
- max

Позволяет связать одного клиента с несколькими каналами входа
и взаимодействия.

Связи:

CustomerExternalAccount → Customer

---

## Корзина

### Cart

Корзина клиента.

Используется для хранения текущего набора выбранных товаров
до оформления заказа.

Один клиент может иметь несколько корзин во времени,
например активную корзину и завершенные или брошенные корзины.

Связи:

Cart → Customer  
Cart → CartItem  
Cart → Order

### CartItem

Позиция товара в корзине.

Связи:

CartItem → Cart  
CartItem → Product  
CartItem → CartItemSelectedValue

### CartItemSelectedValue

Выбранные значения параметров товара в корзине.

Например:
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

- данные клиента на момент оформления
- адрес доставки
- статус заказа
- итоговую стоимость
- канал создания заказа

Заказ может быть создан на основе корзины, но является самостоятельной
сущностью и хранит собственное состояние.

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

- название товара
- цену на момент заказа

Это необходимо для сохранения исторической корректности,
даже если каталог изменится после оформления заказа.

Связи:

OrderItem → Order  
OrderItem → Product  
OrderItem → OrderItemSelectedValue

### OrderItemSelectedValue

Выбранные параметры товара,
зафиксированные в момент оформления заказа.

Например:
- цвет изделия
- тип фурнитуры

Сущность содержит snapshot-данные параметров,
чтобы заказ сохранял исторически корректный состав.

Связи:

OrderItemSelectedValue → OrderItem  
OrderItemSelectedValue → ProductParameter  
OrderItemSelectedValue → ProductParameterValue

---

## Внутренние пользователи

### StaffUser

Внутренний пользователь системы.

Примеры ролей:
- мастер
- менеджер
- администратор

Используется для работы с заказами
и фиксации действий сотрудников в системе.

Связи:

StaffUser → OrderStatusHistory

---

## История статусов заказов

### OrderStatusHistory

История изменений статусов заказа.

Позволяет отслеживать жизненный цикл заказа
и фиксировать, кто и когда изменил его состояние.

Связи:

OrderStatusHistory → Order  
OrderStatusHistory → StaffUser

---

## Платежи

### Payment

Информация о попытке оплаты заказа.

Одна запись Payment соответствует одной попытке оплаты.

Платежи обрабатываются через внешнего провайдера
(YooKassa).

Система хранит:

- внутренний статус попытки оплаты
- статус платежа у провайдера
- идентификатор платежа у провайдера
- ссылку на страницу оплаты
- данные для синхронизации статуса
- технические данные для диагностики

Один заказ может иметь несколько попыток оплаты.

Статус заказа и статус платежа хранятся раздельно,
что позволяет корректно обрабатывать повторные попытки оплаты
и интеграционные сценарии.

Связи:

Payment → Order  
Payment → Customer

---

## Общая структура модели

Customer
 ├── CustomerExternalAccount
 ├── Cart
 │     └── CartItem
 │           └── CartItemSelectedValue
 ├── Order
 │     ├── OrderItem
 │     │     └── OrderItemSelectedValue
 │     ├── Payment
 │     └── OrderStatusHistory
 └── Payment

Product
 ├── ProductPhoto
 ├── CartItem
 ├── OrderItem
 └── ProductAvailableParameter
       └── ProductAvailableParameterValue

ProductParameter
 ├── ProductParameterValue
 ├── CartItemSelectedValue
 └── OrderItemSelectedValue

StaffUser
 └── OrderStatusHistory
