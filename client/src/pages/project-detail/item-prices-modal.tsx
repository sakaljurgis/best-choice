import { useEffect } from 'react';
import type { Item } from '../../api/items';
import { ItemPricesPanel } from './item-prices-panel';

interface ItemPricesModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
}

export function ItemPricesModal({ isOpen, item, onClose }: ItemPricesModalProps) {
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

  if (!isOpen || !item) {
    return null;
  }

  const itemTitle = item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 md:py-16"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-5rem)] md:max-h-[calc(100vh-8rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-200"
        >
          Close
        </button>
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
          <header className="mb-5 flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-slate-900">Edit Item Prices</h2>
            <p className="text-sm text-slate-500">{itemTitle}</p>
          </header>
          <ItemPricesPanel itemId={item.id} />
        </div>
      </div>
    </div>
  );
}
