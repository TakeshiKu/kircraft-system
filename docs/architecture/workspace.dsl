workspace "Kircraft System" "Архитектура системы Kircraft" {

    model {
        customer = person "Клиент" "Просматривает каталог, оформляет и оплачивает заказы."
        admin = person "Администратор" "Управляет каталогом, заказами и статусами."

        telegram = softwareSystem "Telegram" "Мессенджер."
        vk = softwareSystem "VK" "Мессенджер."
        max = softwareSystem "MAX" "Мессенджер."
        yookassa = softwareSystem "YooKassa" "Платежный сервис."
        cdek = softwareSystem "CDEK" "Сервис расчета доставки и получения ПВЗ."
        n8n = softwareSystem "n8n" "Платформа автоматизации и оркестрации интеграционных сценариев."
        llmProvider = softwareSystem "LLM Provider" "Внешний провайдер языковой модели для генерации и анализа текста. Конкретный вендор не привязан архитектурно."

        kircraft = softwareSystem "Kircraft System" "Система управления каталогом, заказами, оплатой и доставкой." {

            webApp = container "Web App" "Клиентский web-интерфейс для просмотра каталога, корзины и оформления заказа." "Next.js / React"
            botGateway = container "Bot Gateway" "Шлюз взаимодействия с Telegram, VK и MAX." "Node.js / TypeScript"
            adminPanel = container "Admin Panel" "Web-интерфейс администратора для управления каталогом и заказами." "React / Web UI"

            backendApi = container "Backend API" "Ядро бизнес-логики каталога, корзины, заказов, доставки, оплаты и уведомлений." "Node.js / TypeScript" {

                catalogModule = component "Catalog Module" "Управление каталогом, коллекциями, товарами, фото и параметрами." "Module"
                cartModule = component "Cart Module" "Управление корзиной и позициями корзины." "Module"
                orderModule = component "Order Module" "Создание, чтение, отмена заказа и расчет итогов." "Module"
                deliveryModule = component "Delivery Module" "Расчет доставки, получение ПВЗ, выбор и сохранение доставки заказа." "Module"
                paymentModule = component "Payment Module" "Создание попыток оплаты, обработка webhook и синхронизация статусов оплаты." "Module"
                customerModule = component "Customer Module" "Клиенты, внешние аккаунты и идентификация по каналам." "Module"
                orderManagementModule = component "Order Management Module" "Управление заказами со стороны администратора и мастера." "Module"
                notificationModule = component "Notification Module" "Формирование событий и правил уведомлений." "Module"
                aiAssistantModule = component "AI Assistant Module" "Генерация черновиков описаний товаров и summary переписки заказов через LLM. Логирует промпты и ответы. Работает с human-in-the-loop." "Module"
                persistenceLayer = component "Persistence Layer" "Доступ к PostgreSQL." "Infrastructure"
                mediaStorageAdapter = component "Media Storage Adapter" "Доступ к Object Storage." "Infrastructure"
                loggingAuditAdapter = component "Logging & Audit Adapter" "Логирование запросов, ошибок, интеграций и доменных событий." "Infrastructure"
            }

            postgres = container "PostgreSQL" "Хранение каталога, клиентов, корзин, заказов, доставок и платежей." "PostgreSQL"
            objectStorage = container "Object Storage" "Хранение изображений и медиафайлов." "S3-compatible storage"
        }

        customer -> kircraft "Оформляет и оплачивает заказы"
        admin -> kircraft "Управляет каталогом, заказами и статусами"

        customer -> webApp "Использует web-интерфейс"
        customer -> botGateway "Использует бота через мессенджеры"
        admin -> adminPanel "Использует интерфейс администратора"

        webApp -> backendApi "Вызывает API" "HTTPS / JSON"
        botGateway -> backendApi "Вызывает API" "HTTPS / JSON"
        adminPanel -> backendApi "Вызывает API" "HTTPS / JSON"

        botGateway -> telegram "Обмен через Bot API" "HTTPS"
        botGateway -> vk "Обмен через Bot API" "HTTPS"
        botGateway -> max "Обмен через Bot API" "HTTPS"

        backendApi -> postgres "Читает и записывает данные" "SQL"
        backendApi -> objectStorage "Читает и записывает медиафайлы" "HTTPS / S3 API"
        backendApi -> yookassa "Создает платежи и получает статусы оплаты" "HTTPS / Webhook"
        backendApi -> cdek "Рассчитывает доставку и получает ПВЗ" "HTTPS / JSON"
        backendApi -> n8n "Запускает и принимает интеграционные сценарии" "HTTPS / Webhook"
        backendApi -> llmProvider "Запрашивает генерацию и анализ текста для AI-сценариев" "HTTPS / API"
        n8n -> backendApi "Вызывает API и webhook" "HTTPS / Webhook"
        n8n -> llmProvider "Запрашивает персонализированное содержимое уведомлений" "HTTPS / API"

        cartModule -> orderModule "Передает данные корзины"
        orderModule -> deliveryModule "Использует данные доставки"
        orderModule -> paymentModule "Инициирует оплату"
        paymentModule -> orderModule "Обновляет статус заказа"

        orderManagementModule -> orderModule "Управляет жизненным циклом заказа"
        orderManagementModule -> deliveryModule "Уточняет и обновляет доставку"

        orderModule -> notificationModule "Публикует события заказа"
        paymentModule -> notificationModule "Публикует события оплаты"
        orderManagementModule -> notificationModule "Публикует события статусов"

        catalogModule -> aiAssistantModule "Запрашивает черновик описания товара"
        orderManagementModule -> aiAssistantModule "Запрашивает summary переписки заказа"
        aiAssistantModule -> llmProvider "Вызывает LLM для генерации и анализа текста" "HTTPS / API"
        aiAssistantModule -> persistenceLayer "Читает данные заказов и переписки, сохраняет логи AI-вызовов"
        aiAssistantModule -> loggingAuditAdapter "Логирует промпты, ответы LLM и факт human-in-the-loop подтверждений"

        orderModule -> loggingAuditAdapter "Логирует события заказа и ошибки"
        paymentModule -> loggingAuditAdapter "Логирует события оплаты и ошибки"
        deliveryModule -> loggingAuditAdapter "Логирует события доставки и ошибки"
        orderManagementModule -> loggingAuditAdapter "Логирует статусы и уточнения"
        notificationModule -> loggingAuditAdapter "Логирует события уведомлений"

        catalogModule -> persistenceLayer "Читает и записывает каталог"
        cartModule -> persistenceLayer "Читает и записывает корзины"
        orderModule -> persistenceLayer "Читает и записывает заказы"
        deliveryModule -> persistenceLayer "Читает и записывает доставки"
        paymentModule -> persistenceLayer "Читает и записывает платежи"
        customerModule -> persistenceLayer "Читает и записывает клиентов"
        orderManagementModule -> persistenceLayer "Читает и записывает статусы и уточнения"

        catalogModule -> mediaStorageAdapter "Читает и записывает медиафайлы"

        persistenceLayer -> postgres "Работает с БД" "SQL"
        mediaStorageAdapter -> objectStorage "Работает с файловым хранилищем" "HTTPS / S3 API"

        paymentModule -> yookassa "Создает платежи и принимает статусы" "HTTPS / Webhook"
        deliveryModule -> cdek "Рассчитывает доставку и получает ПВЗ" "HTTPS / JSON"
        notificationModule -> n8n "Передает события уведомлений и автоматизации" "HTTPS / Webhook"
    }

    views {
        systemContext kircraft "KircraftSystemContext" {
            include customer
            include admin
            include kircraft
            include telegram
            include vk
            include max
            include yookassa
            include cdek
            include n8n
            include llmProvider
            autolayout lr
        }

        container kircraft "KircraftContainerView" {
            include customer
            include admin
            include webApp
            include botGateway
            include adminPanel
            include backendApi
            include postgres
            include objectStorage
            include telegram
            include vk
            include max
            include yookassa
            include cdek
            include n8n
            include llmProvider
            autolayout lr
        }

        component backendApi "KircraftBackendComponents" {
            include catalogModule
            include cartModule
            include orderModule
            include deliveryModule
            include paymentModule
            include customerModule
            include orderManagementModule
            include notificationModule
            include aiAssistantModule
            include persistenceLayer
            include mediaStorageAdapter
            include loggingAuditAdapter
            include postgres
            include objectStorage
            include yookassa
            include cdek
            include n8n
            include llmProvider
            autolayout lr
        }

        theme default
    }
}
