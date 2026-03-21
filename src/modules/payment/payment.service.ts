import type { Pool } from "pg";
import type { PaymentRepository } from "./payment.repository.js";
import type { OrderRepository } from "../order/order.repository.js";
import type { YooKassaService } from "../../integrations/yookassa/yookassa.service.js";
import type { CreatePaymentBodyDto } from "./payment.dto.js";

/**
 * Создание / возврат попытки оплаты, чтение статуса.
 * Идемпотентность: заголовок Idempotency-Key + idempotence_key в БД.
 * Транзакция: создание строки payment + вызов YooKassa — граница в реализации (rollback при сбое провайдера).
 */
export class PaymentService {
  constructor(
    private readonly pool: Pool,
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly yookassa: YooKassaService,
  ) {}

  async createOrReturnPayment(
    customerId: string,
    idempotencyKey: string,
    body: CreatePaymentBodyDto,
  ): Promise<unknown> {
    void this.orders;
    void this.yookassa;
    void customerId;
    void idempotencyKey;
    void body;
    throw new Error("Not implemented");
  }

  async getPayment(customerId: string, paymentId: string) {
    return this.payments.findByIdForCustomer(this.pool, paymentId, customerId);
  }
}
