import { useEffect, useMemo, useState } from 'react';

const normalizeSelection = (attributes: string[]): string[] =>
  Array.from(
    new Set(
      attributes
        .map((attribute) => attribute.trim())
        .filter((attribute) => attribute.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

export interface TrackedAttributesModalProps {
  isOpen: boolean;
  availableAttributes: string[];
  initialSelection: string[];
  onClose: () => void;
  onSubmit: (attributes: string[]) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function TrackedAttributesModal({
  isOpen,
  availableAttributes,
  initialSelection,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage
}: TrackedAttributesModalProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(() =>
    normalizeSelection(initialSelection)
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedAttributes(normalizeSelection(initialSelection));
  }, [isOpen, initialSelection]);

  const sortedAttributes = useMemo(
    () => [...availableAttributes].sort((a, b) => a.localeCompare(b)),
    [availableAttributes]
  );

  if (!isOpen) {
    return null;
  }

  const toggleAttribute = (attribute: string) => {
    setSelectedAttributes((current) => {
      if (current.includes(attribute)) {
        return normalizeSelection(current.filter((value) => value !== attribute));
      }
      return normalizeSelection([...current, attribute]);
    });
  };

  const handleSubmit = async () => {
    const normalized = normalizeSelection(selectedAttributes);
    await onSubmit(normalized);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-200"
          disabled={isSubmitting}
        >
          Close
        </button>
        <div className="px-8 py-6">
          <header className="mb-5 flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-slate-900">Tracked Attributes</h2>
            <p className="text-sm text-slate-500">
              Choose which attributes should be highlighted across the project. Changes may
              influence upcoming priority rules.
            </p>
          </header>
          {sortedAttributes.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedAttributes.map((attribute) => {
                  const checkboxId = `tracked-attribute-${attribute.replace(/\s+/g, '-').toLowerCase()}`;
                  return (
                    <label
                      key={attribute}
                      htmlFor={checkboxId}
                      className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm text-slate-700 transition hover:border-slate-200"
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedAttributes.includes(attribute)}
                        onChange={() => toggleAttribute(attribute)}
                        disabled={isSubmitting}
                      />
                      <span>{attribute}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No attributes available yet. Add item specs to select them here.
            </p>
          )}

          {errorMessage ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <footer className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
