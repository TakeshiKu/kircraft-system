/** См. docs/api/modules/payment-api.md */
export type CreatePaymentBodyDto = { order_id: string };

export type YooKassaWebhookObjectDto = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: {
      order_id?: string;
      payment_attempt_id?: string;
    };
  };
};
