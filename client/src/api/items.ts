import { apiFetch } from './http-client';

export type ItemStatus = 'active' | 'rejected';

export interface Item {
  id: string;
  projectId: string;
  manufacturer: string | null;
  model: string;
  sourceUrlId: string | null;
  sourceUrl: string | null;
  status: ItemStatus;
  note: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  priceSummary: ItemPriceSummary | null;
}

export interface ItemPriceSummary {
  minAmount: number;
  maxAmount: number;
  currency: string | null;
  priceCount: number;
  hasMixedCurrency: boolean;
}

interface ListResponseMeta {
  limit: number;
  offset: number;
  count: number;
}

export interface ProjectItemsResponse {
  data: Item[];
  meta: ListResponseMeta;
}

export interface FetchProjectItemsParams {
  limit?: number;
  offset?: number;
  status?: ItemStatus;
  signal?: AbortSignal;
}

export const fetchProjectItems = async (
  projectId: string,
  params: FetchProjectItemsParams = {}
): Promise<ProjectItemsResponse> => {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  const query = searchParams.toString();
  const path = query
    ? `/projects/${projectId}/items?${query}`
    : `/projects/${projectId}/items`;

  return apiFetch<ProjectItemsResponse>(path, { signal: params.signal });
};

export interface CreateItemPayload {
  manufacturer?: string | null;
  model: string;
  status?: ItemStatus;
  note?: string | null;
  attributes?: Record<string, unknown>;
  sourceUrl?: string | null;
  sourceUrlId?: string | null;
}

interface SingleItemResponse {
  data: Item;
}

export interface ImportedItemData {
  manufacturer: string | null;
  model: string | null;
  note: string | null;
  attributes: Record<string, unknown>;
}

export const createItem = async (
  projectId: string,
  payload: CreateItemPayload
): Promise<Item> => {
  const response = await apiFetch<SingleItemResponse>(
    `/projects/${projectId}/items`,
    {
      method: 'POST',
      body: {
        manufacturer: payload.manufacturer ?? null,
        model: payload.model,
        status: payload.status ?? 'active',
        note: payload.note ?? null,
        attributes: payload.attributes ?? {},
        sourceUrl: payload.sourceUrl ?? null,
        sourceUrlId: payload.sourceUrlId ?? null
      }
    }
  );

  return response.data;
};

interface ImportItemResponse {
  data: ImportedItemData;
}

export const importItemFromUrl = async (
  projectId: string,
  url: string
): Promise<ImportedItemData> => {
  const response = await apiFetch<ImportItemResponse>(
    `/projects/${projectId}/items/import`,
    {
      method: 'POST',
      body: { url }
    }
  );

  return response.data;
};
