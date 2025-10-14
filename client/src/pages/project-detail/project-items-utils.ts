import type { Item } from '@shared/models/item';

const createSortKey = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `array:${value.length}:${value.map((item) => createSortKey(item)).join('|')}`;
  }
  if (value === null) {
    return 'null';
  }
  const type = typeof value;
  if (type === 'number') {
    return `${type}:${(value as number).toString()}`;
  }
  if (type === 'boolean') {
    return `${type}:${value ? '1' : '0'}`;
  }
  if (type === 'string') {
    return `${type}:${value}`;
  }
  return `${type}:${JSON.stringify(value)}`;
};

const normalizeAttributeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => normalizeAttributeValue(item));
    normalizedItems.sort((first, second) => {
      const firstKey = createSortKey(first);
      const secondKey = createSortKey(second);
      if (firstKey < secondKey) {
        return -1;
      }
      if (firstKey > secondKey) {
        return 1;
      }
      return 0;
    });
    return normalizedItems;
  }
  return value;
};

export const areAttributeValuesEqual = (first: unknown, second: unknown): boolean => {
  const normalizedFirst = normalizeAttributeValue(first);
  const normalizedSecond = normalizeAttributeValue(second);

  if (Array.isArray(normalizedFirst) && Array.isArray(normalizedSecond)) {
    if (normalizedFirst.length !== normalizedSecond.length) {
      return false;
    }
    for (let index = 0; index < normalizedFirst.length; index += 1) {
      if (!areAttributeValuesEqual(normalizedFirst[index], normalizedSecond[index])) {
        return false;
      }
    }
    return true;
  }

  return Object.is(normalizedFirst, normalizedSecond);
};

export const formatAttributeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }
    const formattedValues = value
      .map((item) => {
        if (item === null || item === undefined) {
          return '';
        }
        if (typeof item === 'string') {
          return item.trim();
        }
        if (typeof item === 'number') {
          return String(item);
        }
        if (typeof item === 'boolean') {
          return item ? 'Yes' : 'No';
        }
        return JSON.stringify(item);
      })
      .filter((item) => item.length > 0);

    return formattedValues.length ? formattedValues.join(', ') : '—';
  }
  if (typeof value === 'string') {
    return value.length ? value : '—';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(value);
};

export const formatPriceAmount = (amount: number, currency: string | null): string => {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
  return amount.toFixed(2);
};

export const getPriceSummaryDisplay = (
  summary: Item['priceSummary'] | null
): { primary: string; secondary: string | null } => {
  if (!summary || summary.priceCount === 0) {
    return { primary: '—', secondary: null };
  }

  const resolveCurrency = (preferred: string | null) => preferred ?? summary.currency ?? null;
  const formatConditionLabel = (
    condition: 'new' | 'used',
    amount: number | null,
    count: number,
    currency: string | null,
    hasMixedCurrency: boolean
  ): string | null => {
    if (!count) {
      return null;
    }
    if (amount === null || hasMixedCurrency) {
      return `${condition} prices vary (${count})`;
    }
    const resolvedCurrency = resolveCurrency(currency);
    const formatted = formatPriceAmount(amount, resolvedCurrency);
    return `${condition} from ${formatted} (${count})`;
  };

  const newLabel = formatConditionLabel(
    'new',
    summary.newMinAmount,
    summary.newCount,
    summary.newCurrency,
    summary.newHasMixedCurrency
  );
  const usedLabel = formatConditionLabel(
    'used',
    summary.usedMinAmount,
    summary.usedCount,
    summary.usedCurrency,
    summary.usedHasMixedCurrency
  );

  if (newLabel || usedLabel) {
    if (newLabel && usedLabel) {
      return { primary: newLabel, secondary: usedLabel };
    }
    return { primary: newLabel ?? usedLabel ?? '—', secondary: null };
  }

  if (!summary.hasMixedCurrency) {
    const resolvedCurrency = resolveCurrency(null);
    const formattedMin = formatPriceAmount(summary.minAmount, resolvedCurrency);
    const formattedMax = formatPriceAmount(summary.maxAmount, resolvedCurrency);
    if (summary.minAmount === summary.maxAmount) {
      return {
        primary: `${formattedMin} (${summary.priceCount})`,
        secondary: null
      };
    }
    return {
      primary: `from ${formattedMin} (${summary.priceCount})`,
      secondary: `up to ${formattedMax}`
    };
  }

  return {
    primary: `Multiple currencies (${summary.priceCount})`,
    secondary: null
  };
};
