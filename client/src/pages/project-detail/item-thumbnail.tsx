import { useState } from 'react';

interface ItemThumbnailProps {
  url: string | null;
  alt: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const sizeClassMap: Record<Required<ItemThumbnailProps>['size'], string> = {
  sm: 'h-14 w-14',
  md: 'h-20 w-20'
};

export function ItemThumbnail({ url, alt, size = 'sm', onClick }: ItemThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const hasImage = !!url && !hasError;
  const sizeClasses = sizeClassMap[size];
  const containerClasses = `flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 ${sizeClasses} ${
    onClick ? 'cursor-pointer transition hover:border-blue-200 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white' : ''
  }`;

  const content = hasImage ? (
    <img
      src={url ?? ''}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
      No Image
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={containerClasses}
        aria-label={`View images for ${alt}`}
      >
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}
