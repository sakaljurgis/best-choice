interface ProjectItemsHeaderProps {
  itemCount: number;
  totalItemCount: number;
  isLoading: boolean;
  showDifferencesOnly: boolean;
  hasAttributeDifferences: boolean;
  onToggleDifferences: (value: boolean) => void;
  showLargeImages: boolean;
  onToggleLargeImages: (value: boolean) => void;
  showActiveOnly: boolean;
  onToggleActiveOnly: (value: boolean) => void;
}

export function ProjectItemsHeader({
  itemCount,
  totalItemCount,
  isLoading,
  showDifferencesOnly,
  hasAttributeDifferences,
  onToggleDifferences,
  showLargeImages,
  onToggleLargeImages,
  showActiveOnly,
  onToggleActiveOnly
}: ProjectItemsHeaderProps) {
  const subtitle = isLoading
    ? 'Loading items…'
    : totalItemCount === 0
      ? 'No items yet – add your first one below.'
      : showActiveOnly && itemCount !== totalItemCount
        ? `${itemCount} of ${totalItemCount} active item${itemCount === 1 ? '' : 's'} shown.`
        : `${totalItemCount} item${totalItemCount === 1 ? '' : 's'} tracked.`;

  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Items</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 text-xs font-medium uppercase tracking-wide text-slate-500 md:flex-row md:items-center md:gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={showActiveOnly}
            onChange={(event) => onToggleActiveOnly(event.target.checked)}
          />
          Active only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            checked={showDifferencesOnly}
            onChange={(event) => onToggleDifferences(event.target.checked)}
            disabled={!hasAttributeDifferences}
          />
          Show differences only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={showLargeImages}
            onChange={(event) => onToggleLargeImages(event.target.checked)}
          />
          Larger images
        </label>
      </div>
    </header>
  );
}
