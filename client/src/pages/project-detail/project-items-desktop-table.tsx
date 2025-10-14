import { Fragment } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Item } from '@shared/models/item';
import { ItemPricesPanel } from './item-prices-panel';
import { formatAttributeValue, getPriceSummaryDisplay } from './project-items-utils';

interface ProjectItemsDesktopTableProps {
  items: Item[];
  visibleAttributes: string[];
  expandedItemId: string | null;
  onTogglePrices: (itemId: string) => void;
  onEditItem: (item: Item) => void;
  projectId: string | undefined;
}

export function ProjectItemsDesktopTable({
  items,
  visibleAttributes,
  expandedItemId,
  onTogglePrices,
  onEditItem,
  projectId
}: ProjectItemsDesktopTableProps) {
  return (
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
              const attributes = (item.attributes ?? {}) as Record<string, unknown>;
              const priceDisplay = getPriceSummaryDisplay(item.priceSummary);
              const isExpanded = expandedItemId === item.id;
              const panelId = `item-${item.id}-prices-desktop`;

              return (
                <Fragment key={item.id}>
                  <tr className={`hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="group inline-flex items-center gap-2 rounded-md text-left text-slate-900 transition hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                            title="Edit item details"
                          >
                            <span
                              aria-hidden
                              className={`inline-block h-2.5 w-2.5 rounded-full ${
                                item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <span className="font-semibold group-hover:underline">
                              {item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model}
                            </span>
                          </button>
                          {item.sourceUrl ? (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                              title="Open source link"
                            >
                              <ExternalLink aria-hidden className="h-4 w-4" />
                              <span className="sr-only">Open source link</span>
                            </a>
                          ) : null}
                        </div>
                        {item.note ? (
                          <span className="text-xs text-slate-500">{item.note}</span>
                        ) : null}
                      </div>
                    </td>
                    {visibleAttributes.map((attribute) => (
                      <td key={attribute} className="px-4 py-3 align-top text-xs text-slate-600">
                        {formatAttributeValue(attributes[attribute])}
                      </td>
                    ))}
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-0.5 text-xs">
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
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="bg-slate-50">
                      <td colSpan={visibleAttributes.length + 2} className="px-4 py-4">
                        <div id={panelId}>
                          <ItemPricesPanel itemId={item.id} projectId={projectId} />
                        </div>
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
  );
}
