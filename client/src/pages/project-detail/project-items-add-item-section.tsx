interface ProjectItemsAddItemSectionProps {
  quickUrl: string;
  quickError: string | null;
  onQuickUrlChange: (value: string) => void;
  onAddUrl: () => void;
  onAddManual: () => void;
  isImportingFromUrl: boolean;
}

export function ProjectItemsAddItemSection({
  quickUrl,
  quickError,
  onQuickUrlChange,
  onAddUrl,
  onAddManual,
  isImportingFromUrl
}: ProjectItemsAddItemSectionProps) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Add Item</h3>
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
          {quickError ? <p className="mt-2 text-xs font-medium text-red-600">{quickError}</p> : null}
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
  );
}
