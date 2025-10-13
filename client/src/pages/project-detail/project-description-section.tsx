import { FormEvent, useEffect, useState } from 'react';

interface ProjectDescriptionSectionProps {
  description: string | null;
  isUpdating: boolean;
  onUpdate: (nextDescription: string | null) => Promise<void>;
}

export function ProjectDescriptionSection({
  description,
  isUpdating,
  onUpdate
}: ProjectDescriptionSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(description ?? '');
    }
  }, [description, isEditing]);

  const startEditing = () => {
    setError(null);
    setDraft(description ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setError(null);
    setDraft(description ?? '');
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = draft.trim();
    const normalizedDescription = trimmed.length ? trimmed : null;

    try {
      await onUpdate(normalizedDescription);
      setIsEditing(false);
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Description</h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={startEditing}
            className="text-xs font-semibold uppercase tracking-wide text-blue-600 transition hover:text-blue-700"
            disabled={isUpdating}
          >
            Edit
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <form className="mt-3 flex flex-col gap-3" onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Add context about this project..."
            disabled={isUpdating}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving…' : 'Save Description'}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed"
              disabled={isUpdating}
            >
              Cancel
            </button>
          </div>
          {error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : null}
        </form>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          {description ?? 'No description provided yet.'}
        </p>
      )}
    </div>
  );
}
