import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createItemPrice,
  fetchItemPrices,
  type CreateItemPricePayload,
  type ItemPricesResponse
} from '../api/item-prices';
import { projectsKeys } from './projects';

const DEFAULT_LIMIT = 50;

export const itemPricesKeys = {
  all: ['itemPrices'] as const,
  list: (itemId: string) => [...itemPricesKeys.all, itemId, 'list'] as const
};

export const useItemPricesQuery = (
  itemId: string | undefined,
  enabled: boolean
) =>
  useQuery<ItemPricesResponse>({
    queryKey: itemId ? itemPricesKeys.list(itemId) : ['itemPrices', 'missing'],
    enabled: enabled && Boolean(itemId),
    queryFn: ({ signal }) => fetchItemPrices(itemId!, { limit: DEFAULT_LIMIT, offset: 0, signal })
  });

export const useCreateItemPriceMutation = (
  itemId: string | undefined,
  projectId: string | undefined
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItemPricePayload) => {
      if (!itemId) {
        throw new Error('itemId is required to create a price');
      }

      return createItemPrice(itemId, payload);
    },
    onSuccess: () => {
      if (!itemId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: itemPricesKeys.list(itemId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.items(projectId) });
        queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      }
    }
  });
};
