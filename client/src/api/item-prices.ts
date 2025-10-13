import { apiFetch } from './http-client';

export type PriceCondition = 'new' | 'used';
export type PriceSourceType = 'url' | 'manual';

export interface ItemPrice {
  id: string;
  itemId: string;
  condition: PriceCondition;
  amount: number;
  currency: string;
  sourceType: PriceSourceType;
  sourceUrlId: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
  note: string | null;
  observedAt: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListResponseMeta {
  limit: number;
  offset: number;
  count: number;
}

export interface ItemPricesResponse {
  data: ItemPrice[];
  meta: ListResponseMeta;
}

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
  sourceType: PriceSourceType;
  sourceUrl?: string | null;
  sourceUrlId?: string | null;
  sourceNote?: string | null;
  note?: string | null;
  observedAt?: string;
  isPrimary?: boolean;
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
        sourceType: payload.sourceType,
        sourceUrl: payload.sourceUrl ?? null,
        sourceUrlId: payload.sourceUrlId ?? null,
        sourceNote: payload.sourceNote ?? null,
        note: payload.note ?? null,
        observedAt: payload.observedAt ?? null,
        isPrimary: payload.isPrimary ?? false
      }
    }
  );

  return response.data;
};
