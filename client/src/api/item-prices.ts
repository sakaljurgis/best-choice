import type { PaginatedResponse } from '@shared/models/pagination';
import type { ItemPrice, PriceCondition } from '@shared/models/item-price';
import { apiFetch } from './http-client';

export type { PriceCondition };

export type ItemPricesResponse = PaginatedResponse<ItemPrice>;

export interface FetchItemPricesParams {
  limit?: number;
  offset?: number;
  condition?: PriceCondition;
  signal?: AbortSignal;
}

export const fetchItemPrices = async (
  itemId: string,
  params: FetchItemPricesParams = {}
): Promise<ItemPricesResponse> => {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }

  if (params.condition) {
    searchParams.set('condition', params.condition);
  }

  const query = searchParams.toString();
  const path = query
    ? `/items/${itemId}/prices?${query}`
    : `/items/${itemId}/prices`;

  return apiFetch<ItemPricesResponse>(path, { signal: params.signal });
};

export interface CreateItemPricePayload {
  condition: PriceCondition;
  amount: number;
  currency: string;
  sourceUrl?: string | null;
  sourceUrlId?: string | null;
  note?: string | null;
}

interface SingleItemPriceResponse {
  data: ItemPrice;
}

export const createItemPrice = async (
  itemId: string,
  payload: CreateItemPricePayload
): Promise<ItemPrice> => {
  const response = await apiFetch<SingleItemPriceResponse>(
    `/items/${itemId}/prices`,
    {
      method: 'POST',
      body: {
        condition: payload.condition,
        amount: payload.amount,
        currency: payload.currency,
        sourceUrl: payload.sourceUrl ?? null,
        sourceUrlId: payload.sourceUrlId ?? null,
        note: payload.note ?? null
      }
    }
  );

  return response.data;
};

export const deleteItemPrice = async (priceId: string): Promise<void> => {
  await apiFetch<null>(`/prices/${priceId}`, {
    method: 'DELETE'
  });
};
