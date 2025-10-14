export type ItemStatus = 'active' | 'rejected';

export interface ItemPriceSummary {
  minAmount: number;
  maxAmount: number;
  currency: string | null;
  priceCount: number;
  hasMixedCurrency: boolean;
  newMinAmount: number | null;
  newCount: number;
  newCurrency: string | null;
  newHasMixedCurrency: boolean;
  usedMinAmount: number | null;
  usedCount: number;
  usedCurrency: string | null;
  usedHasMixedCurrency: boolean;
}

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
