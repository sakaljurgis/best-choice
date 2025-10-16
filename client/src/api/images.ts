import type { ItemImage } from '@shared/models/item-image';
import { apiFetch } from './http-client';

interface ItemImagesResponse {
  data: ItemImage[];
}

interface SingleImageResponse {
  data: ItemImage;
}

export const fetchItemImages = async (itemId: string): Promise<ItemImage[]> => {
  const response = await apiFetch<ItemImagesResponse>(`/items/${itemId}/images`);
  return response.data;
};

export const createItemImage = async (
  itemId: string,
  url: string
): Promise<ItemImage> => {
  const response = await apiFetch<SingleImageResponse>(
    `/items/${itemId}/images`,
    {
      method: 'POST',
      body: { url }
    }
  );

  return response.data;
};

export const deleteItemImage = async (imageId: string): Promise<void> => {
  await apiFetch(`/images/${imageId}`, {
    method: 'DELETE'
  });
};
