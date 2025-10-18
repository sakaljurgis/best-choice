import { useEffect, useMemo, useState } from 'react';
import type { Item } from '@shared/models/item';
import { areAttributeValuesEqual } from './project-items-utils';
import { ProjectItemsHeader } from './project-items-header';
import { ProjectItemsDesktopTable } from './project-items-desktop-table';
import { ProjectItemsMobileList } from './project-items-mobile-list';
import { ProjectItemsAddItemSection } from './project-items-add-item-section';

interface ProjectItemsSectionProps {
  items: Item[];
  isLoading: boolean;
  error: Error | null;
  projectAttributes: string[];
  quickUrl: string;
  quickError: string | null;
  onQuickUrlChange: (value: string) => void;
  onAddUrl: () => void;
  onAddManual: () => void;
  isImportingFromUrl: boolean;
  onEditItem: (item: Item) => void;
  onEditItemStatus: (item: Item) => void;
  projectId: string | undefined;
  onViewItemImages: (item: Item) => void;
}

export function ProjectItemsSection({
  items,
  isLoading,
  error,
  projectAttributes,
  quickUrl,
  quickError,
  onQuickUrlChange,
  onAddUrl,
  onAddManual,
  isImportingFromUrl,
  onEditItem,
  onEditItemStatus,
  projectId,
  onViewItemImages
}: ProjectItemsSectionProps) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showLargeImages, setShowLargeImages] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const displayItems = useMemo(() => {
    const filtered = showActiveOnly
      ? items.filter((item) => item.status === 'active')
      : items;

    const createDisplayName = (item: Item) =>
      item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model;

    return [...filtered].sort((first, second) => {
      if (first.status !== second.status) {
        return first.status === 'active' ? -1 : 1;
      }
      return createDisplayName(first).localeCompare(createDisplayName(second), undefined, {
        sensitivity: 'base'
      });
    });
  }, [items, showActiveOnly]);

  const mismatchedAttributes = useMemo(() => {
    const result = new Set<string>();

    if (displayItems.length <= 1 || projectAttributes.length === 0) {
      return result;
    }

    projectAttributes.forEach((attribute) => {
      const trimmed = attribute.trim();
      if (!trimmed.length) {
        return;
      }

      let referenceValue: unknown = null;
      let hasReference = false;

      for (const item of displayItems) {
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
  }, [displayItems, projectAttributes]);

  useEffect(() => {
    if (showDifferencesOnly && mismatchedAttributes.size === 0) {
      setShowDifferencesOnly(false);
    }
  }, [showDifferencesOnly, mismatchedAttributes]);

  useEffect(() => {
    if (!expandedItemId) {
      return;
    }
    const itemStillPresent = displayItems.some((item) => item.id === expandedItemId);
    if (!itemStillPresent) {
      setExpandedItemId(null);
    }
  }, [displayItems, expandedItemId]);

  const visibleAttributes = useMemo(() => {
    if (!showDifferencesOnly) {
      return projectAttributes;
    }

    return projectAttributes.filter((attribute) => mismatchedAttributes.has(attribute));
  }, [showDifferencesOnly, projectAttributes, mismatchedAttributes]);

  const hasAttributeDifferences = mismatchedAttributes.size > 0;
  const showNoDifferencesMessage =
    !hasAttributeDifferences && projectAttributes.length > 0 && displayItems.length > 1;

  const handleTogglePrices = (itemId: string) => {
    setExpandedItemId((current) => (current === itemId ? null : itemId));
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ProjectItemsHeader
          itemCount={displayItems.length}
          totalItemCount={items.length}
          isLoading={isLoading}
          showDifferencesOnly={showDifferencesOnly}
          hasAttributeDifferences={hasAttributeDifferences}
          onToggleDifferences={(value) => setShowDifferencesOnly(value)}
          showLargeImages={showLargeImages}
          onToggleLargeImages={(value) => setShowLargeImages(value)}
          showActiveOnly={showActiveOnly}
          onToggleActiveOnly={(value) => {
            setShowActiveOnly(value);
            if (value) {
              setExpandedItemId((current) => {
                if (!current) {
                  return current;
                }
                const stillVisible = items.some(
                  (item) => item.id === current && item.status === 'active'
                );
                return stillVisible ? current : null;
              });
            }
          }}
        />

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error.message}</p>
        ) : null}

        {showNoDifferencesMessage ? (
          <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            All tracked attributes match across items.
          </p>
        ) : null}

        <ProjectItemsDesktopTable
          items={displayItems}
          visibleAttributes={visibleAttributes}
          expandedItemId={expandedItemId}
          onTogglePrices={handleTogglePrices}
          onEditItem={onEditItem}
          onEditItemStatus={onEditItemStatus}
          projectId={projectId}
          onViewItemImages={onViewItemImages}
          showLargeImages={showLargeImages}
        />

        <ProjectItemsMobileList
          items={displayItems}
          visibleAttributes={visibleAttributes}
          expandedItemId={expandedItemId}
          onTogglePrices={handleTogglePrices}
          onEditItem={onEditItem}
          onEditItemStatus={onEditItemStatus}
          projectId={projectId}
          onViewItemImages={onViewItemImages}
          showLargeImages={showLargeImages}
        />
      </section>

      <ProjectItemsAddItemSection
        quickUrl={quickUrl}
        quickError={quickError}
        onQuickUrlChange={onQuickUrlChange}
        onAddUrl={onAddUrl}
        onAddManual={onAddManual}
        isImportingFromUrl={isImportingFromUrl}
      />
    </>
  );
}
