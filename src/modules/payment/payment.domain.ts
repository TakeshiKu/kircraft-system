import type { MoneyMinor } from "../../shared/types/money.js";
import type { PaymentInternalStatus } from "./payment-state-machine.js";

export type Payment = {
  paymentId: string;
  orderId: string;
  customerId: string;
  amountMinor: MoneyMinor;
  currency: string;
  status: PaymentInternalStatus;
  providerStatus: string | null;
  externalPaymentId: string | null;
  idempotenceKey: string;
  paymentAttemptId: string;
  confirmationUrl: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
