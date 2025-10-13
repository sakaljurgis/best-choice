import { useMemo, useState } from 'react';
import { TrackedAttributesModal } from '../../components/tracked-attributes-modal';

interface TrackedAttributesSectionProps {
  attributes: string[];
  availableAttributes: string[];
  isUpdating: boolean;
  onUpdate: (attributes: string[]) => Promise<void>;
}

export function TrackedAttributesSection({
  attributes,
  availableAttributes,
  isUpdating,
  onUpdate
}: TrackedAttributesSectionProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAttributes = attributes.length > 0;
  const sortedAttributes = useMemo(
    () => [...attributes].sort((a, b) => a.localeCompare(b)),
    [attributes]
  );

  const openModal = () => {
    setErrorMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isUpdating) {
      return;
    }
    setErrorMessage(null);
    setModalOpen(false);
  };

  const handleSubmit = async (nextAttributes: string[]) => {
    setErrorMessage(null);
    try {
      await onUpdate(nextAttributes);
      setModalOpen(false);
    } catch (submitError) {
      setErrorMessage((submitError as Error).message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Tracked Attributes
        </h2>
        <button
          type="button"
          onClick={openModal}
          className="text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:text-blue-700"
          disabled={isUpdating}
        >
          Edit
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Select which item attributes should be highlighted for this project.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {hasAttributes ? (
          sortedAttributes.map((attribute) => (
            <span
              key={attribute}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {attribute}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">No attributes defined yet.</span>
        )}
      </div>

      <TrackedAttributesModal
        isOpen={isModalOpen}
        availableAttributes={availableAttributes}
        initialSelection={attributes}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSubmitting={isUpdating}
        errorMessage={errorMessage}
      />
    </div>
  );
}
