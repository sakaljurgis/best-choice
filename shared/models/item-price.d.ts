export type PriceCondition = 'new' | 'used';

export interface ItemPrice {
  id: string;
  itemId: string;
  condition: PriceCondition;
  amount: number;
  currency: string;
  sourceUrlId: string | null;
  sourceUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
