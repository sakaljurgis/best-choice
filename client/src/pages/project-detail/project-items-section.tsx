import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Item } from '../../api/items';
import { ItemPricesPanel } from './item-prices-panel';

interface ProjectItemsSectionProps {
  items: Item[];
  isLoading: boolean;
  error: Error | null;
  projectAttributes: string[];
  expandedItemId: string | null;
  onToggleItem: (itemId: string) => void;
  quickUrl: string;
  quickError: string | null;
  onQuickUrlChange: (value: string) => void;
  onAddUrl: () => void;
  onAddManual: () => void;
  isImportingFromUrl: boolean;
}

const formatAttributeValue = (value: unknown): string => {
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

const areAttributeValuesEqual = (first: unknown, second: unknown): boolean => {
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

const formatPriceAmount = (amount: number, currency: string | null): string => {
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

const getPriceSummaryDisplay = (
  summary: Item['priceSummary'] | null
): { primary: string; secondary: string | null } => {
  if (!summary || summary.priceCount === 0) {
    return { primary: '—', secondary: null };
  }

  if (summary.hasMixedCurrency) {
    const countLabel = `${summary.priceCount} price${summary.priceCount === 1 ? '' : 's'}`;
    return {
      primary: countLabel,
      secondary: 'Multiple currencies'
    };
  }

  const formattedMin = formatPriceAmount(summary.minAmount, summary.currency);

  if (summary.priceCount === 1 || summary.minAmount === summary.maxAmount) {
    return {
      primary: formattedMin,
      secondary: summary.priceCount > 1 ? `${summary.priceCount} prices` : null
    };
  }

  const formattedMax = formatPriceAmount(summary.maxAmount, summary.currency);

  return {
    primary: `${formattedMin} – ${formattedMax}`,
    secondary: `${summary.priceCount} prices`
  };
};

export function ProjectItemsSection({
  items,
  isLoading,
  error,
  projectAttributes,
  expandedItemId,
  onToggleItem,
  quickUrl,
  quickError,
  onQuickUrlChange,
  onAddUrl,
  onAddManual,
  isImportingFromUrl
}: ProjectItemsSectionProps) {
  const baseColumnCount = 2; // Item, Prices (status indicator lives inside item cell)
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  const mismatchedAttributes = useMemo(() => {
    const result = new Set<string>();

    if (items.length <= 1 || projectAttributes.length === 0) {
      return result;
    }

    projectAttributes.forEach((attribute) => {
      const trimmed = attribute.trim();
      if (!trimmed.length) {
        return;
      }

      let referenceValue: unknown = null;
      let hasReference = false;

      for (const item of items) {
        const attributes = (item.attributes ?? {}) as Record<string, unknown>;
        const currentValue = attributes[attribute];

        if (!hasReference) {
          referenceValue = currentValue;
          hasReference = true;
          continue;
        }

        if (!areAttributeValuesEqual(currentValue, referenceValue)) {
          result.add(attribute);
          break;
        }
      }
    });

    return result;
  }, [items, projectAttributes]);

  useEffect(() => {
    if (showDifferencesOnly && mismatchedAttributes.size === 0) {
      setShowDifferencesOnly(false);
    }
  }, [showDifferencesOnly, mismatchedAttributes]);

  const visibleAttributes = useMemo(() => {
    if (!showDifferencesOnly) {
      return projectAttributes;
    }

    return projectAttributes.filter((attribute) => mismatchedAttributes.has(attribute));
  }, [showDifferencesOnly, projectAttributes, mismatchedAttributes]);

  const totalColumns = baseColumnCount + visibleAttributes.length;
  const hasAttributeDifferences = mismatchedAttributes.size > 0;
  const showNoDifferencesMessage =
    !hasAttributeDifferences && projectAttributes.length > 0 && items.length > 1;

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Items</h2>
            <p className="text-sm text-slate-500">
              {isLoading
                ? 'Loading items…'
                : items.length
                  ? `${items.length} item${items.length === 1 ? '' : 's'} tracked.`
                  : 'No items yet – add your first one below.'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              checked={showDifferencesOnly}
              onChange={(event) => setShowDifferencesOnly(event.target.checked)}
              disabled={!hasAttributeDifferences}
            />
            Show differences only
          </label>
        </header>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error.message}</p>
        ) : null}

        {showNoDifferencesMessage ? (
          <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            All tracked attributes match across items.
          </p>
        ) : null}

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500">
                    Item
                  </th>
                  {visibleAttributes.map((attribute) => (
                    <th
                      key={attribute}
                      className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500"
                    >
                      {attribute}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-slate-500">
                    Prices
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const attributes = (item.attributes ?? {}) as Record<string, unknown>;
                  const priceDisplay = getPriceSummaryDisplay(item.priceSummary);
                  const priceButtonLabel = isExpanded ? 'Hide Prices' : 'Edit Prices';

                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-2 text-slate-900">
                              <span
                                aria-hidden
                                className={`inline-block h-2.5 w-2.5 rounded-full ${
                                  item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span className="font-semibold">
                                {item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model}
                              </span>
                            </span>
                            {item.note ? (
                              <span className="text-xs text-slate-500">{item.note}</span>
                            ) : null}
                            {item.sourceUrl ? (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                View source
                              </a>
                            ) : null}
                          </div>
                        </td>
                        {visibleAttributes.map((attribute) => (
                          <td key={attribute} className="px-4 py-3 align-top text-xs text-slate-600">
                            {formatAttributeValue(attributes[attribute])}
                          </td>
                        ))}
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="text-sm font-semibold text-slate-900">
                                {priceDisplay.primary}
                              </span>
                              {priceDisplay.secondary ? (
                                <span className="text-slate-500">{priceDisplay.secondary}</span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleItem(item.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                              aria-label={priceButtonLabel}
                              title={priceButtonLabel}
                            >
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M14.243 2.929a2 2 0 00-2.828 0L4 10.344V13h2.656l7.415-7.414a2 2 0 000-2.828z" />
                                <path
                                  fillRule="evenodd"
                                  d="M3.25 15a1.75 1.75 0 001.75 1.75h10A1.75 1.75 0 0016.75 15v-4a.75.75 0 00-1.5 0v4a.25.25 0 01-.25.25h-10a.25.25 0 01-.25-.25v-10a.25.25 0 01.25-.25h4a.75.75 0 000-1.5h-4A1.75 1.75 0 003.25 5v10z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="sr-only">{priceButtonLabel}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-slate-50">
                          <td colSpan={totalColumns} className="px-4 py-5">
                            <ItemPricesPanel itemId={item.id} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {items.map((item) => {
            const isExpanded = expandedItemId === item.id;
            const attributes = (item.attributes ?? {}) as Record<string, unknown>;
            const priceDisplay = getPriceSummaryDisplay(item.priceSummary);
            const priceButtonLabel = isExpanded ? 'Hide Prices' : 'Edit Prices';

            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <h3 className="text-lg font-semibold text-slate-900">
                      {item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model}
                    </h3>
                  </div>
                </div>

                {item.note ? (
                  <p className="mt-1 text-sm text-slate-600">Note: {item.note}</p>
                ) : null}
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View source
                  </a>
                ) : null}

                <div className="mt-3 space-y-2">
                  {visibleAttributes.map((attribute) => (
                    <div key={attribute} className="flex justify-between text-xs text-slate-600">
                      <span className="font-semibold uppercase tracking-wide text-slate-500">
                        {attribute}
                      </span>
                      <span className="text-right">
                        {formatAttributeValue(attributes[attribute])}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-0.5 text-xs">
                  <span className="text-sm font-semibold text-slate-900">{priceDisplay.primary}</span>
                  {priceDisplay.secondary ? (
                    <span className="text-slate-500">{priceDisplay.secondary}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onToggleItem(item.id)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:bg-blue-50"
                >
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M14.243 2.929a2 2 0 00-2.828 0L4 10.344V13h2.656l7.415-7.414a2 2 0 000-2.828z" />
                    <path
                      fillRule="evenodd"
                      d="M3.25 15a1.75 1.75 0 001.75 1.75h10A1.75 1.75 0 0016.75 15v-4a.75.75 0 00-1.5 0v4a.25.25 0 01-.25.25h-10a.25.25 0 01-.25-.25v-10a.25.25 0 01.25-.25h4a.75.75 0 000-1.5h-4A1.75 1.75 0 003.25 5v10z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {priceButtonLabel}
                </button>

                {isExpanded ? (
                  <div className="mt-4">
                    <ItemPricesPanel itemId={item.id} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Add Item
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Paste a product link to pre-fill details or switch to manual entry.
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="quick-item-url">
              Item URL
            </label>
            <input
              id="quick-item-url"
              type="url"
              value={quickUrl}
              onChange={(event) => onQuickUrlChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="https://example.com/product"
            />
            {quickError ? (
              <p className="mt-2 text-xs font-medium text-red-600">{quickError}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAddUrl}
              disabled={isImportingFromUrl}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isImportingFromUrl ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Importing…
                </>
              ) : (
                'Add from URL'
              )}
            </button>
            <button
              type="button"
              onClick={onAddManual}
              className="rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Add Manually
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
