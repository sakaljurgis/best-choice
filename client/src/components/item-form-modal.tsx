import { FormEvent, useEffect, useState } from 'react';
import type { CreateItemPayload, ItemStatus } from '../api/items';

const itemStatusOptions: ItemStatus[] = ['active', 'rejected'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export interface ItemFormModalProps {
  isOpen: boolean;
  mode: 'url' | 'manual';
  initialUrl: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (payload: CreateItemPayload) => Promise<unknown>;
  isSubmitting: boolean;
  projectAttributes: string[];
}

export function ItemFormModal({
  isOpen,
  mode,
  initialUrl,
  onClose,
  onSuccess,
  onSubmit,
  isSubmitting,
  projectAttributes
}: ItemFormModalProps) {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<ItemStatus>('active');
  const [note, setNote] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [attributesJson, setAttributesJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setManufacturer('');
    setModel('');
    setStatus('active');
    setNote('');
    setAttributesJson('{}');
    setError(null);
    setSourceUrl(initialUrl ?? '');
  }, [isOpen, initialUrl, mode]);

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
    setError(null);

    if (!model.trim()) {
      setError('Model is required.');
      return;
    }

    let attributes: Record<string, unknown> = {};
    const trimmedAttributes = attributesJson.trim();

    if (trimmedAttributes) {
      try {
        const parsed = JSON.parse(trimmedAttributes);
        if (!isPlainObject(parsed)) {
          setError('Attributes must be a JSON object.');
          return;
        }
        attributes = parsed;
      } catch (parseError) {
        setError(`Attributes JSON is invalid: ${(parseError as Error).message}`);
        return;
      }
    }

    try {
      await onSubmit({
        manufacturer: manufacturer.trim() ? manufacturer.trim() : null,
        model: model.trim(),
        status,
        note: note.trim() ? note.trim() : null,
        attributes,
        sourceUrl: sourceUrl.trim() ? sourceUrl.trim() : null
      });
      onSuccess();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
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
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
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
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'url' ? 'Review Item Details' : 'Add Item Manually'}
            </h2>
            <p className="text-sm text-slate-500">
              {mode === 'url'
                ? 'Double-check the imported information and fill in any gaps.'
                : 'Provide the specs and notes for this item.'}
            </p>
          </header>

          <form className="grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-manufacturer">
                Manufacturer / Brand
              </label>
              <input
                id="modal-item-manufacturer"
                type="text"
                value={manufacturer}
                onChange={(event) => setManufacturer(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="MX Master 3"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-status">
                Status
              </label>
              <select
                id="modal-item-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as ItemStatus)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {itemStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-source-url">
                Source URL {mode === 'manual' ? '(optional)' : ''}
              </label>
              <input
                id="modal-item-source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="https://example.com/specs"
              />
            </div>

            <div className="md:col-span-1 md:row-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-note">
                Note
              </label>
              <textarea
                id="modal-item-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                className="h-full min-h-[96px] rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Why is this item interesting?"
              />
            </div>

            <div className="md:col-span-1 md:row-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-item-attributes">
                Attributes JSON
              </label>
              <textarea
                id="modal-item-attributes"
                value={attributesJson}
                onChange={(event) => setAttributesJson(event.target.value)}
                rows={6}
                className="h-full min-h-[120px] font-mono rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder='{"dpi": 1000, "wireless": true}'
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Tracked Attributes</span>
              {projectAttributes.length ? (
                <div className="flex flex-wrap gap-2">
                  {projectAttributes.map((attribute) => (
                    <span
                      key={attribute}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {attribute}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No attributes configured for this project.</p>
              )}
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Fields marked with * are required. Attributes must be valid JSON.
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
                  disabled={isSubmitting}
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
