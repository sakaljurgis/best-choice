import { FormEvent, useEffect, useState } from 'react';
import type { CreateItemPayload, ImportedItemData } from '../api/items';

export interface ItemFormModalProps {
  isOpen: boolean;
  mode: 'url' | 'manual' | 'edit';
  initialUrl: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (payload: CreateItemPayload) => Promise<unknown>;
  isSubmitting: boolean;
  projectAttributes: string[];
  initialData: ImportedItemData | null;
  isInitialDataLoading: boolean;
  initialDataError: string | null;
}

interface AttributeEntry {
  id: string;
  key: string;
  value: string;
}

const createUniqueId = () => Math.random().toString(36).slice(2);

const stringifyAttributeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function ItemFormModal({
  isOpen,
  mode,
  initialUrl,
  onClose,
  onSuccess,
  onSubmit,
  isSubmitting,
  projectAttributes,
  initialData,
  isInitialDataLoading,
  initialDataError
}: ItemFormModalProps) {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [attributeEntries, setAttributeEntries] = useState<AttributeEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isFormDisabled = isSubmitting || isInitialDataLoading;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError(null);
    const resolvedSourceUrl = initialData?.sourceUrl ?? initialUrl ?? '';
    setSourceUrl(resolvedSourceUrl);
    setManufacturer(initialData?.manufacturer ?? '');
    setModel(initialData?.model ?? '');
    setNote(initialData?.note ?? '');

    const trackedAttributeSet = new Set(
      projectAttributes.map((attribute) => attribute.trim()).filter((attribute) => attribute.length)
    );

    const trackedEntries: AttributeEntry[] = [];
    const additionalEntries: AttributeEntry[] = [];

    if (initialData?.attributes) {
      Object.entries(initialData.attributes).forEach(([rawKey, value]) => {
        const key = rawKey.trim();
        if (!key.length) {
          return;
        }
        const entry = {
          id: createUniqueId(),
          key,
          value: stringifyAttributeValue(value)
        };
        if (trackedAttributeSet.has(key)) {
          trackedEntries.push(entry);
          trackedAttributeSet.delete(key);
        } else {
          additionalEntries.push(entry);
        }
      });
    }

    trackedAttributeSet.forEach((key) => {
      trackedEntries.push({
        id: createUniqueId(),
        key,
        value: ''
      });
    });

    setAttributeEntries([...trackedEntries, ...additionalEntries]);
  }, [isOpen, initialUrl, initialData, projectAttributes]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormDisabled) {
      return;
    }
    setError(null);

    if (!model.trim()) {
      setError('Model is required.');
      return;
    }

    const attributesPayload: Record<string, unknown> = {};
    const seenAttributeKeys = new Set<string>();

    for (const attribute of attributeEntries) {
      const key = attribute.key.trim();
      if (!key) {
        setError('Attribute name cannot be empty.');
        return;
      }

      const normalizedKey = key.toLowerCase();
      if (seenAttributeKeys.has(normalizedKey)) {
        setError(`Attribute name "${key}" is already in use.`);
        return;
      }

      seenAttributeKeys.add(normalizedKey);
      attributesPayload[key] = attribute.value.trim() ? attribute.value.trim() : null;
    }

    try {
      const payload: CreateItemPayload = {
        manufacturer: manufacturer.trim() ? manufacturer.trim() : null,
        model: model.trim(),
        note: note.trim() ? note.trim() : null,
        attributes: attributesPayload,
        sourceUrl: sourceUrl.trim() ? sourceUrl.trim() : null
      };

      if (mode !== 'edit') {
        payload.status = 'active';
      }

      await onSubmit(payload);
      onSuccess();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 md:py-16"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-5rem)] md:max-h-[calc(100vh-8rem)]"
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

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'url'
                ? 'Review Item Details'
                : mode === 'edit'
                  ? 'Edit Item'
                  : 'Add Item Manually'}
            </h2>
            <p className="text-sm text-slate-500">
              {mode === 'url'
                ? 'Double-check the imported information and fill in any gaps.'
                : mode === 'edit'
                  ? 'Update this item with the latest information.'
                  : 'Provide the specs and notes for this item.'}
            </p>
          </header>

          {isInitialDataLoading ? (
            <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <svg
                aria-hidden="true"
                className="h-4 w-4 animate-spin text-blue-600"
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
              <span>Importing item details…</span>
            </div>
          ) : null}

          {initialDataError ? (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {initialDataError}
            </p>
          ) : null}

          <form
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
            onSubmit={handleSubmit}
            aria-busy={isInitialDataLoading}
          >
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-source-url">
                Source URL {mode === 'url' ? '' : '(optional)'}
              </label>
              <input
                id="modal-item-source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                disabled={isFormDisabled}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                placeholder="https://example.com/specs"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-manufacturer">
                Manufacturer / Brand
              </label>
              <input
                id="modal-item-manufacturer"
                type="text"
                value={manufacturer}
                onChange={(event) => setManufacturer(event.target.value)}
                disabled={isFormDisabled}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                placeholder="Logitech"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-model">
                Model *
              </label>
              <input
                id="modal-item-model"
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                required
                disabled={isFormDisabled}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                placeholder="MX Master 3"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-note">
                Note
              </label>
              <textarea
                id="modal-item-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                disabled={isFormDisabled}
                className="min-h-[64px] rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                placeholder="Why is this item interesting?"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-4">
              <span className="text-sm font-medium text-slate-700">Attributes</span>
              {attributeEntries.length ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[420px] space-y-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <span>Key</span>
                      <span>Value</span>
                      <span className="text-right">Actions</span>
                    </div>
                    {attributeEntries.map((attribute) => (
                      <div
                        key={attribute.id}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3"
                      >
                        <input
                          id={`attribute-name-${attribute.id}`}
                          type="text"
                          value={attribute.key}
                          disabled={isFormDisabled}
                          onChange={(event) => {
                            const { value } = event.target;
                            setAttributeEntries((previous) =>
                              previous.map((item) =>
                                item.id === attribute.id ? { ...item, key: value } : item
                              )
                            );
                            setError(null);
                          }}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                          placeholder="Attribute name"
                        />
                        <input
                          id={`attribute-value-${attribute.id}`}
                          type="text"
                          value={attribute.value}
                          disabled={isFormDisabled}
                          onChange={(event) => {
                            const { value } = event.target;
                            setAttributeEntries((previous) =>
                              previous.map((item) =>
                                item.id === attribute.id ? { ...item, value } : item
                              )
                            );
                            setError(null);
                          }}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                          placeholder="Attribute value"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setAttributeEntries((previous) =>
                                previous.filter((item) => item.id !== attribute.id)
                              );
                              setError(null);
                            }}
                            disabled={isFormDisabled}
                            className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No attributes added yet. Add one to get started.</p>
              )}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => {
                    setAttributeEntries((previous) => [
                      ...previous,
                      { id: createUniqueId(), key: '', value: '' }
                    ]);
                    setError(null);
                  }}
                  disabled={isFormDisabled}
                  className="rounded-md border border-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                >
                  Add Attribute
                </button>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Fields marked with * are required. Remove any attribute row you do not need.
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  disabled={isFormDisabled}
                >
                  {isSubmitting ? 'Saving…' : 'Save Item'}
                </button>
              </div>
            </div>
          </form>

          {error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
