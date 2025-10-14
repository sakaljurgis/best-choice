import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Item } from '@shared/models/item';
import {
  useCreateItemMutation,
  useUpdateItemMutation,
  useProjectItemsQuery,
  useProjectQuery,
  useUpdateProjectMutation
} from '../../query/projects';
import {
  importItemFromUrl,
  type CreateItemPayload,
  type ImportedItemData,
  type UpdateItemPayload
} from '../../api/items';
import { ItemFormModal } from '../../components/item-form-modal';
import { ProjectHeader } from './project-header';
import { ProjectDescriptionSection } from './project-description-section';
import { TrackedAttributesSection } from './tracked-attributes-section';
import { ProjectItemsSection } from './project-items-section';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProjectQuery(projectId);
  const itemsQuery = useProjectItemsQuery(projectId);
  const createItemMutation = useCreateItemMutation(projectId);
  const updateItemMutation = useUpdateItemMutation(projectId);
  const updateProjectMutation = useUpdateProjectMutation(projectId);

  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'url' | 'manual' | 'edit'>('manual');
  const [modalInitialUrl, setModalInitialUrl] = useState<string | null>(null);
  const [importedItemData, setImportedItemData] = useState<ImportedItemData | null>(null);
  const [isImportingItem, setIsImportingItem] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importRequestIdRef = useRef(0);
  const [itemBeingEdited, setItemBeingEdited] = useState<Item | null>(null);

  const project = projectQuery.data;
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);
  const projectAttributes = useMemo(() => project?.attributes ?? [], [project]);
  const availableAttributes = useMemo(() => {
    const attributeSet = new Set<string>();

    projectAttributes.forEach((attribute) => {
      if (attribute.trim().length) {
        attributeSet.add(attribute.trim());
      }
    });

    items.forEach((item) => {
      const itemAttributes = item.attributes ?? {};
      Object.keys(itemAttributes).forEach((key) => {
        const trimmed = key.trim();
        if (trimmed.length) {
          attributeSet.add(trimmed);
        }
      });
    });

    return Array.from(attributeSet);
  }, [projectAttributes, items]);

  const openItemModal = (mode: 'url' | 'manual' | 'edit', initialUrl: string | null) => {
    setItemModalMode(mode);
    setModalInitialUrl(initialUrl);
    setIsItemModalOpen(true);
  };

  const handleAddUrlClick = async () => {
    if (isImportingItem) {
      return;
    }

    setItemBeingEdited(null);

    const trimmed = quickUrl.trim();
    if (!trimmed) {
      setQuickError('Enter a URL to import item details.');
      return;
    }

    if (!projectId) {
      setQuickError('Project identifier is missing. Reload the page and try again.');
      return;
    }

    setQuickError(null);
    setImportError(null);
    setImportedItemData(null);
    setItemBeingEdited(null);

    const requestId = importRequestIdRef.current + 1;
    importRequestIdRef.current = requestId;

    openItemModal('url', trimmed);
    setIsImportingItem(true);

    try {
      const data = await importItemFromUrl(projectId, trimmed);
      if (importRequestIdRef.current !== requestId) {
        return;
      }
      setImportedItemData(data);
    } catch (error) {
      if (importRequestIdRef.current !== requestId) {
        return;
      }
      const message =
        error instanceof Error && error.message.trim().length
          ? error.message.trim()
          : 'We could not load that URL.';
      const normalizedMessage = message.endsWith('.') ? message : `${message}.`;
      setImportError(`${normalizedMessage} You can fill in the details manually.`);
    } finally {
      if (importRequestIdRef.current === requestId) {
        setIsImportingItem(false);
      }
    }
  };

  const handleAddManualClick = () => {
    setQuickError(null);
    setImportError(null);
    setImportedItemData(null);
    setIsImportingItem(false);
    importRequestIdRef.current += 1;
    setItemBeingEdited(null);
    openItemModal('manual', quickUrl.trim() || null);
  };

  const handleEditItem = (item: Item) => {
    setQuickError(null);
    setImportError(null);
    setImportedItemData(null);
    setIsImportingItem(false);
    importRequestIdRef.current += 1;
    setItemBeingEdited(item);
    openItemModal('edit', item.sourceUrl ?? null);
  };

  const handleModalClose = () => {
    setIsItemModalOpen(false);
    setQuickError(null);
    setImportError(null);
    setImportedItemData(null);
    setIsImportingItem(false);
    importRequestIdRef.current += 1;
    setItemBeingEdited(null);
  };

  const handleModalSuccess = () => {
    if (itemModalMode === 'url') {
      setQuickUrl('');
    }
    setQuickError(null);
    setIsItemModalOpen(false);
    setImportError(null);
    setImportedItemData(null);
    setIsImportingItem(false);
    importRequestIdRef.current += 1;
    setItemBeingEdited(null);
  };

  const handleDescriptionUpdate = async (description: string | null) => {
    await updateProjectMutation.mutateAsync({ description });
  };

  const handleAttributesUpdate = async (attributes: string[]) => {
    await updateProjectMutation.mutateAsync({ attributes });
  };

  const handleUpdateItemSubmit = (payload: CreateItemPayload) => {
    if (!itemBeingEdited) {
      return Promise.reject(new Error('No item selected for editing'));
    }

    const updatePayload: UpdateItemPayload = {
      manufacturer: payload.manufacturer,
      model: payload.model,
      note: payload.note,
      attributes: payload.attributes,
      sourceUrl: payload.sourceUrl,
      sourceUrlId: payload.sourceUrlId
    };

    return updateItemMutation.mutateAsync({
      itemId: itemBeingEdited.id,
      payload: updatePayload
    });
  };

  if (!projectId) {
    return <p className="text-sm text-red-600">Project identifier is missing from the URL.</p>;
  }

  if (projectQuery.isLoading) {
    return <p className="text-sm text-slate-600">Loading project details…</p>;
  }

  if (projectQuery.isError || !project) {
    return (
      <p className="text-sm text-red-600">
        Failed to load project. {(projectQuery.error as Error | undefined)?.message}
      </p>
    );
  }

  const handleQuickUrlChange = (value: string) => {
    setQuickUrl(value);
    if (quickError) {
      setQuickError(null);
    }
  };

  const modalInitialData =
    itemModalMode === 'url'
      ? importedItemData
      : itemModalMode === 'edit' && itemBeingEdited
        ? {
            manufacturer: itemBeingEdited.manufacturer,
            model: itemBeingEdited.model,
            note: itemBeingEdited.note,
            attributes: itemBeingEdited.attributes ?? {},
            sourceUrl: itemBeingEdited.sourceUrl ?? null
          }
        : null;

  const itemModalSubmit =
    itemModalMode === 'edit' ? handleUpdateItemSubmit : createItemMutation.mutateAsync;

  const itemModalIsSubmitting = itemModalMode === 'edit'
    ? updateItemMutation.isPending
    : createItemMutation.isPending;

  const itemModalInitialDataLoading =
    itemModalMode === 'url' ? isImportingItem : false;

  const itemModalInitialDataError = itemModalMode === 'url' ? importError : null;

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ProjectHeader name={project.name} status={project.status} />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <ProjectDescriptionSection
            description={project.description}
            isUpdating={updateProjectMutation.isPending}
            onUpdate={handleDescriptionUpdate}
          />

          <TrackedAttributesSection
            attributes={projectAttributes}
            availableAttributes={availableAttributes}
            isUpdating={updateProjectMutation.isPending}
            onUpdate={handleAttributesUpdate}
          />
        </div>
      </section>

      <ProjectItemsSection
        items={items}
        isLoading={itemsQuery.isLoading}
        error={itemsQuery.isError ? (itemsQuery.error as Error) : null}
        projectAttributes={projectAttributes}
        quickUrl={quickUrl}
        quickError={quickError}
        onQuickUrlChange={handleQuickUrlChange}
        onAddUrl={handleAddUrlClick}
        onAddManual={handleAddManualClick}
        isImportingFromUrl={isImportingItem}
        onEditItem={handleEditItem}
        projectId={projectId}
      />

      <ItemFormModal
        isOpen={isItemModalOpen}
        mode={itemModalMode}
        initialUrl={modalInitialUrl}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        onSubmit={itemModalSubmit}
        isSubmitting={itemModalIsSubmitting}
        projectAttributes={projectAttributes}
        initialData={modalInitialData}
        isInitialDataLoading={itemModalInitialDataLoading}
        initialDataError={itemModalInitialDataError}
      />
    </div>
  );
}
