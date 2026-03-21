/**
 * API DTO — зеркало docs/api/modules/cart-api.md (фрагменты).
 * Не смешивать с доменными типами при маппинге в handler.
 */
export type CartItemResponseDto = Record<string, unknown>;
export type CartResponseDto = Record<string, unknown>;

export type AddCartItemBodyDto = {
  product_id: string;
  quantity: number;
  selected_values?: Array<{
    parameter_id: string;
    parameter_value_id: string;
  }>;
};

export type PatchCartItemBodyDto = {
  quantity?: number;
  selected_values?: Array<{
    parameter_id: string;
    parameter_value_id: string;
  }>;
};
