/** POST /api/v1/orders/:order_id/cancel — ответ при успешной отмене. */
export type CancelOrderResponseDto = {
  order_id: string;
  status: "cancelled";
};
