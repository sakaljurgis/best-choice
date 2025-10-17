import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface GalleryImage {
  id: string;
  url: string;
}

interface ItemImageGalleryOverlayProps {
  isOpen: boolean;
  itemName: string;
  images: GalleryImage[];
  activeIndex: number;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ItemImageGalleryOverlay({
  isOpen,
  itemName,
  images,
  activeIndex,
  isLoading,
  error,
  onClose,
  onNext,
  onPrevious
}: ItemImageGalleryOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (isLoading || images.length <= 1) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious, images.length, isLoading]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const activeImage = images[activeIndex] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Image gallery for ${itemName}`}
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{itemName}</h2>
            <p className="text-sm text-slate-500">
              {images.length > 0 ? `Image ${activeIndex + 1} of ${images.length}` : 'No images available'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            title="Close gallery"
          >
            <X aria-hidden className="h-5 w-5" />
            <span className="sr-only">Close gallery</span>
          </button>
        </div>

        <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading images…</p>
          ) : error ? (
            <p className="px-4 text-center text-sm font-medium text-red-600">{error}</p>
          ) : activeImage ? (
            <>
              <img
                key={activeImage.id}
                src={activeImage.url}
                alt={`Image ${activeIndex + 1} of ${itemName}`}
                className="max-h-[70vh] w-full object-contain"
              />
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={onPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    title="Previous image"
                  >
                    <ChevronLeft aria-hidden className="h-5 w-5" />
                    <span className="sr-only">Previous image</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    title="Next image"
                  >
                    <ChevronRight aria-hidden className="h-5 w-5" />
                    <span className="sr-only">Next image</span>
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <p className="px-4 text-center text-sm text-slate-500">
              No images have been added for this item yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
