import { ExternalLink } from 'lucide-react';
import type { Item } from '@shared/models/item';
import { ItemPricesPanel } from './item-prices-panel';
import { formatAttributeValue, getPriceSummaryDisplay } from './project-items-utils';
import { ItemThumbnail } from './item-thumbnail';

interface ProjectItemsMobileListProps {
  items: Item[];
  visibleAttributes: string[];
  expandedItemId: string | null;
  onTogglePrices: (itemId: string) => void;
  onEditItem: (item: Item) => void;
  onEditItemStatus: (item: Item) => void;
  projectId: string | undefined;
  onViewItemImages: (item: Item) => void;
  showLargeImages: boolean;
}

export function ProjectItemsMobileList({
  items,
  visibleAttributes,
  expandedItemId,
  onTogglePrices,
  onEditItem,
  onEditItemStatus,
  projectId,
  onViewItemImages,
  showLargeImages
}: ProjectItemsMobileListProps) {
  return (
    <div className="space-y-4 md:hidden">
      {items.map((item) => {
        const attributes = (item.attributes ?? {}) as Record<string, unknown>;
        const priceDisplay = getPriceSummaryDisplay(item.priceSummary);
        const isExpanded = expandedItemId === item.id;
        const panelId = `item-${item.id}-prices-mobile`;
        const displayName = item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model;

        return (
          <div key={item.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <ItemThumbnail
                url={item.defaultImageUrl}
                alt={displayName}
                size={showLargeImages ? 'lg' : 'md'}
                onClick={() => onViewItemImages(item)}
              />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onEditItemStatus(item)}
                    className="mt-1 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-transparent transition hover:border-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    title="Toggle active status or edit note"
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-3 w-3 rounded-full ${
                        item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <span className="sr-only">
                      {item.status === 'active'
                        ? `Set ${displayName} as rejected or edit note`
                        : `Set ${displayName} as active or edit note`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="group flex flex-1 items-center gap-2 text-left text-slate-900 transition hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    title="Edit item details"
                  >
                    <span className="font-semibold group-hover:underline">{displayName}</span>
                  </button>
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      title="Open source link"
                    >
                      <ExternalLink aria-hidden className="h-5 w-5" />
                      <span className="sr-only">Open source link</span>
                    </a>
                  ) : null}
                </div>

                {item.note ? <p className="text-sm text-slate-600">Note: {item.note}</p> : null}

                <div className="space-y-2">
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
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-0.5 text-xs">
              <button
                type="button"
                onClick={() => onTogglePrices(item.id)}
                className="inline-flex items-center gap-2 self-start rounded-md text-left text-sm font-semibold text-slate-900 transition hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                title={isExpanded ? 'Close Prices' : 'View Prices'}
                aria-expanded={isExpanded}
                aria-controls={panelId}
              >
                <span>{priceDisplay.primary}</span>
                {isExpanded ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Close
                  </span>
                ) : null}
                <span className="sr-only">
                  {isExpanded ? 'Close price list' : 'View price list'}
                </span>
              </button>
              {priceDisplay.secondary ? (
                <span className="text-slate-500">{priceDisplay.secondary}</span>
              ) : null}
            </div>
            {isExpanded ? (
              <div id={panelId} className="mt-4">
                <ItemPricesPanel itemId={item.id} projectId={projectId} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
