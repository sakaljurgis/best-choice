import { useEffect, useState } from 'react';
import type { Item, ItemStatus } from '@shared/models/item';

interface ItemStatusModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onSubmit: (payload: { status: ItemStatus; note: string | null }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function ItemStatusModal({
  isOpen,
  item,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage
}: ItemStatusModalProps) {
  const [status, setStatus] = useState<ItemStatus>('active');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen || !item) {
      return;
    }
    setStatus(item.status);
    setNote(item.note ?? '');
  }, [isOpen, item]);

  if (!isOpen || !item) {
    return null;
  }

  const handleSubmit = async () => {
    await onSubmit({ status, note: note.trim().length ? note : null });
  };

  const isActive = status === 'active';

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
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
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
            <h2 className="text-xl font-semibold text-slate-900">Item Status &amp; Note</h2>
            <p className="text-sm text-slate-500">
              Update the activity state and note for {item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model}.
            </p>
          </header>

          <div className="space-y-5">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={isActive}
                onChange={(event) => setStatus(event.target.checked ? 'active' : 'rejected')}
                disabled={isSubmitting}
              />
              <span>
                <span className="font-semibold">{isActive ? 'Active' : 'Rejected'}</span>
                <span className="block text-xs text-slate-500">
                  Toggle to mark this item as {isActive ? 'inactive' : 'active'}.
                </span>
              </span>
            </label>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-semibold">Internal Note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add context or reminders for this item…"
                disabled={isSubmitting}
              />
              <span className="mt-1 block text-xs text-slate-500">
                Notes are optional. Leave blank to remove the note.
              </span>
            </label>
          </div>

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
