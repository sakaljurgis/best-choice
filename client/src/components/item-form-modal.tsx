import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { CreateItemPayload, ImportedItemData } from '../api/items';
import type { AttributeScalarType } from '../utils/attribute-values';
import { inferScalarValue } from '../utils/attribute-values';

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
  forcedString: boolean;
  expectedType: AttributeScalarType | null;
  isArrayMember: boolean;
}

const createUniqueId = () => Math.random().toString(36).slice(2);

const createBlankEntry = (key = '', isArrayMember = false): AttributeEntry => ({
  id: createUniqueId(),
  key,
  value: '',
  forcedString: false,
  expectedType: null,
  isArrayMember
});

const parseScalarArrayCandidate = (raw: string): unknown[] | null => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return null;
    }
    if (
      parsed.every(
        (item) =>
          item === null ||
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean'
      )
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const createForcedStringEntry = (
  key: string,
  value: string,
  isArrayMember = false
): AttributeEntry => ({
  id: createUniqueId(),
  key,
  value,
  forcedString: true,
  expectedType: 'string',
  isArrayMember
});

const createEntryFromScalar = (
  key: string,
  rawValue: unknown,
  isArrayMember = false
): AttributeEntry => {
  if (rawValue === null || rawValue === undefined) {
    return { ...createBlankEntry(key, isArrayMember), key };
  }

  if (typeof rawValue === 'boolean') {
    return {
      id: createUniqueId(),
      key,
      value: rawValue ? 'true' : 'false',
      forcedString: false,
      expectedType: 'boolean',
      isArrayMember
    };
  }

  if (typeof rawValue === 'number') {
    return {
      id: createUniqueId(),
      key,
      value: String(rawValue),
      forcedString: false,
      expectedType: 'number',
      isArrayMember
    };
  }

  if (typeof rawValue === 'string') {
    if (rawValue.startsWith("'")) {
      return createForcedStringEntry(key, rawValue.slice(1), isArrayMember);
    }
    const inference = inferScalarValue(rawValue, false, null);
    const expectedType =
      inference.normalizedValue === null ? null : inference.type;
    return {
      id: createUniqueId(),
      key,
      value: inference.canonicalText,
      forcedString: false,
      expectedType,
      isArrayMember
    };
  }

  try {
    const serialized = JSON.stringify(rawValue);
    if (typeof serialized === 'string') {
      return createForcedStringEntry(key, serialized, isArrayMember);
    }
  } catch {
    // ignore serialization errors
  }

  return createForcedStringEntry(key, String(rawValue), isArrayMember);
};

const expandAttributeValue = (key: string, value: unknown): AttributeEntry[] => {
  if (Array.isArray(value)) {
    const entries = value
      .map((item) => {
        if (Array.isArray(item)) {
          try {
            return createForcedStringEntry(key, JSON.stringify(item), true);
          } catch {
            return createForcedStringEntry(key, String(item), true);
          }
        }
        return createEntryFromScalar(key, item, true);
      })
      .flat();
    return entries.length
      ? entries.map((entry) => ({
          ...entry,
          id: createUniqueId(),
          key,
          isArrayMember: true
        }))
      : [createBlankEntry(key, true)];
  }

  if (typeof value === 'string' && !value.startsWith("'")) {
    const parsed = parseScalarArrayCandidate(value);
    if (parsed) {
      const entries = parsed
        .map((item) => createEntryFromScalar(key, item, true))
        .flat();
      return entries.length
        ? entries.map((entry) => ({
            ...entry,
            id: createUniqueId(),
            key,
            isArrayMember: true
          }))
        : [createBlankEntry(key, true)];
    }
  }

  return [createEntryFromScalar(key, value, false)];
};

const normalizeArrayMembership = (entries: AttributeEntry[]): AttributeEntry[] => {
  const keyLedger = new Map<
    string,
    {
      count: number;
      flagged: boolean;
    }
  >();

  entries.forEach((entry) => {
    const key = entry.key.trim();
    if (!key.length) {
      return;
    }
    const current = keyLedger.get(key) ?? { count: 0, flagged: false };
    current.count += 1;
    current.flagged = current.flagged || entry.isArrayMember;
    keyLedger.set(key, current);
  });

  return entries.map((entry) => {
    const key = entry.key.trim();
    if (!key.length) {
      return entry;
    }
    const info = keyLedger.get(key);
    if (!info) {
      return entry;
    }
    const shouldBeArray = info.flagged || info.count > 1;
    if (entry.isArrayMember === shouldBeArray) {
      return entry;
    }
    return { ...entry, isArrayMember: shouldBeArray };
  });
};

const computeTrackedKeySet = (attributes: string[]): Set<string> =>
  new Set(
    attributes
      .map((attribute) => attribute.trim().toLowerCase())
      .filter((attribute) => attribute.length)
  );

const isTrackedKey = (key: string, trackedKeys: Set<string>): boolean => {
  if (!key) {
    return false;
  }
  return trackedKeys.has(key.trim().toLowerCase());
};

const sortAttributeEntries = (
  entries: AttributeEntry[],
  trackedKeys: Set<string>
): AttributeEntry[] => {
  const decorated = entries.map((entry, index) => ({
    entry,
    index,
    isTracked: isTrackedKey(entry.key, trackedKeys)
  }));

  decorated.sort((a, b) => {
    if (a.isTracked === b.isTracked) {
      return a.index - b.index;
    }
    return a.isTracked ? -1 : 1;
  });

  return decorated.map(({ entry }) => entry);
};

const normalizeAndSortEntries = (
  entries: AttributeEntry[],
  trackedKeys: Set<string>
): AttributeEntry[] => sortAttributeEntries(normalizeArrayMembership(entries), trackedKeys);

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
  const trackedAttributeSet = useMemo(
    () => computeTrackedKeySet(projectAttributes),
    [projectAttributes]
  );

  const updateAttributeEntries = useCallback(
    (updater: (previous: AttributeEntry[]) => AttributeEntry[]) => {
      setAttributeEntries((previous) =>
        normalizeAndSortEntries(updater(previous), trackedAttributeSet)
      );
    },
    [trackedAttributeSet]
  );

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

    const remainingTrackedKeys = new Set(
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
        const isTracked = remainingTrackedKeys.has(key);
        const entries = expandAttributeValue(key, value).map((entry) => ({
          ...entry,
          key
        }));

        if (isTracked) {
          trackedEntries.push(...entries);
          remainingTrackedKeys.delete(key);
        } else {
          additionalEntries.push(...entries);
        }
      });
    }

    remainingTrackedKeys.forEach((key) => {
      trackedEntries.push(createBlankEntry(key));
    });

    setAttributeEntries(
      normalizeAndSortEntries([...trackedEntries, ...additionalEntries], trackedAttributeSet)
    );
  }, [isOpen, initialUrl, initialData, projectAttributes, trackedAttributeSet]);

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
    const arraySourceKeys = new Set<string>();
    const keyCounts = new Map<string, number>();

    for (const attribute of attributeEntries) {
      const key = attribute.key.trim();
      if (!key) {
        if (!attribute.value.trim()) {
          continue;
        }
        setError('Attribute name cannot be empty.');
        return;
      }

      const trimmedValue = attribute.value.trim();
      if (!trimmedValue.length && !attribute.forcedString) {
        continue;
      }

      const inference = inferScalarValue(
        attribute.value,
        attribute.forcedString,
        attribute.expectedType
      );

      if (inference.error) {
        setError(`Attribute "${key}" has an invalid value. ${inference.error}`);
        return;
      }

      let normalizedValue: unknown;

      if (attribute.forcedString) {
        normalizedValue = `'${attribute.value}`;
      } else {
        normalizedValue = inference.normalizedValue;
      }

      const existing = attributesPayload[key];
      if (existing === undefined) {
        attributesPayload[key] = normalizedValue;
      } else if (Array.isArray(existing)) {
        existing.push(normalizedValue);
      } else {
        attributesPayload[key] = [existing, normalizedValue];
      }

      const currentCount = keyCounts.get(key) ?? 0;
      keyCounts.set(key, currentCount + 1);

      if (attribute.isArrayMember) {
        arraySourceKeys.add(key);
      }
    }

    arraySourceKeys.forEach((key) => {
      const value = attributesPayload[key];
      if (Array.isArray(value)) {
        return;
      }
      attributesPayload[key] = value !== undefined ? [value] : [];
    });

    keyCounts.forEach((count, key) => {
      if (count > 1 && !Array.isArray(attributesPayload[key])) {
        const existing = attributesPayload[key];
        attributesPayload[key] =
          existing === undefined ? [] : [existing];
      }
    });

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
                    {attributeEntries.map((attribute) => {
                      const inference = inferScalarValue(
                        attribute.value,
                        attribute.forcedString,
                        attribute.expectedType
                      );
                      const trimmedValue = attribute.value.trim();
                      const canonicalHint =
                        attribute.forcedString ||
                        !trimmedValue.length ||
                        trimmedValue === inference.canonicalText
                          ? null
                          : inference.canonicalText;
                      const isTracked = isTrackedKey(attribute.key, trackedAttributeSet);

                      return (
                        <div
                          key={attribute.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3"
                        >
                          <div className="flex flex-col gap-1">
                            <input
                              id={`attribute-name-${attribute.id}`}
                              type="text"
                              value={attribute.key}
                              disabled={isFormDisabled}
                              onChange={(event) => {
                                const { value } = event.target;
                                updateAttributeEntries((previous) =>
                                  previous.map((item) =>
                                    item.id === attribute.id ? { ...item, key: value } : item
                                  )
                                );
                                setError(null);
                              }}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                              placeholder="Attribute name"
                            />
                            {isTracked ? (
                              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                Tracked
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <input
                              id={`attribute-value-${attribute.id}`}
                              type="text"
                              value={attribute.value}
                              disabled={isFormDisabled}
                              onChange={(event) => {
                                const { value } = event.target;
                                updateAttributeEntries((previous) =>
                                  previous.map((item) => {
                                    if (item.id !== attribute.id) {
                                      return item;
                                    }
                                    const shouldForceString =
                                      !item.forcedString && value.startsWith("'");
                                    const nextForcedString =
                                      shouldForceString ? true : item.forcedString;
                                    const normalizedValue = shouldForceString
                                      ? value.slice(1)
                                      : value;
                                    const expectedSourceType = nextForcedString
                                      ? 'string'
                                      : item.expectedType;
                                    let nextInference = inferScalarValue(
                                      normalizedValue,
                                      nextForcedString,
                                      expectedSourceType
                                    );
                                    let nextExpectedType: AttributeScalarType | null;
                                    if (!nextForcedString && item.expectedType && nextInference.error) {
                                      const relaxedInference = inferScalarValue(
                                        normalizedValue,
                                        false,
                                        null
                                      );
                                      if (!relaxedInference.error) {
                                        nextInference = relaxedInference;
                                        nextExpectedType =
                                          relaxedInference.normalizedValue === null
                                            ? null
                                            : relaxedInference.type;
                                      } else {
                                        nextExpectedType = item.expectedType;
                                      }
                                    } else {
                                      nextExpectedType = nextForcedString
                                        ? 'string'
                                        : item.expectedType ??
                                          (nextInference.normalizedValue === null
                                            ? null
                                            : nextInference.type);
                                    }
                                    return {
                                      ...item,
                                      value: normalizedValue,
                                      forcedString: nextForcedString,
                                      expectedType: nextExpectedType
                                    };
                                  })
                                );
                                setError(null);
                              }}
                              onBlur={() => {
                                updateAttributeEntries((previous) =>
                                  previous.map((item) => {
                                    if (item.id !== attribute.id) {
                                      return item;
                                    }
                                    if (item.forcedString) {
                                      return item;
                                    }
                                    const nextInference = inferScalarValue(
                                      item.value,
                                      false,
                                      item.expectedType
                                    );
                                    const nextExpectedType =
                                      item.expectedType ??
                                      (nextInference.normalizedValue === null
                                        ? null
                                        : nextInference.type);
                                    return {
                                      ...item,
                                      value: nextInference.canonicalText,
                                      expectedType: nextExpectedType
                                    };
                                  })
                                );
                              }}
                              className={`rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 ${
                                inference.error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300'
                              }`}
                              placeholder="Attribute value"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                {attribute.forcedString
                                  ? 'String literal'
                                  : `Detected ${inference.type}${
                                      canonicalHint ? ` → ${canonicalHint}` : ''
                                    }`}
                              </span>
                              {inference.error ? (
                                <span className="text-xs font-medium text-red-600">
                                  {inference.error}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                updateAttributeEntries((previous) =>
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
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No attributes added yet. Add one to get started.</p>
              )}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => {
                    updateAttributeEntries((previous) => [...previous, createBlankEntry()]);
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
