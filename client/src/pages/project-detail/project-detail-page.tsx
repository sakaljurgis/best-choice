import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Item } from '@shared/models/item';
import { useQueryClient } from '@tanstack/react-query';
import {
  projectsKeys,
  useCreateItemMutation,
  useUpdateItemMutation,
  useProjectItemsQuery,
  useProjectQuery,
  useUpdateProjectMutation
} from '../../query/projects';
import {
  fetchItem,
  importItemFromUrl,
  type ImportedItemData,
  type UpdateItemPayload
} from '../../api/items';
import { createItemImage, deleteItemImage } from '../../api/images';
import { ItemFormModal, type ItemFormSubmitPayload } from '../../components/item-form-modal';
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
  const queryClient = useQueryClient();

  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<'url' | 'manual' | 'edit'>('manual');
  const [modalInitialUrl, setModalInitialUrl] = useState<string | null>(null);
  const [importedItemData, setImportedItemData] = useState<ImportedItemData | null>(null);
  const [isImportingItem, setIsImportingItem] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importRequestIdRef = useRef(0);
  const editRequestIdRef = useRef(0);
  const [itemBeingEdited, setItemBeingEdited] = useState<Item | null>(null);
  const [editItemInitialData, setEditItemInitialData] = useState<ImportedItemData | null>(null);
  const [isLoadingItemDetails, setIsLoadingItemDetails] = useState(false);
  const [editItemError, setEditItemError] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  const project = projectQuery.data;
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);
  const projectAttributes = useMemo(() => {
    if (!project?.attributes) {
      return [];
    }
    const normalized = project.attributes
      .map((attribute) => attribute.trim())
      .filter((attribute) => attribute.length);
    return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
  }, [project]);
  const availableAttributes = useMemo(() => {
    const attributeSet = new Set<string>();

    projectAttributes.forEach((attribute) => {
      attributeSet.add(attribute);
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

    return Array.from(attributeSet).sort((a, b) => a.localeCompare(b));
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
    setEditItemInitialData(null);
    setEditItemError(null);
    setIsLoadingItemDetails(false);
    setItemBeingEdited(null);
    editRequestIdRef.current += 1;

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
    editRequestIdRef.current += 1;
    setItemBeingEdited(null);
    setEditItemInitialData(null);
    setEditItemError(null);
    setIsLoadingItemDetails(false);
    setIsSavingItem(false);
    openItemModal('manual', quickUrl.trim() || null);
  };

  const handleEditItem = async (item: Item) => {
    setQuickError(null);
    setImportError(null);
    setImportedItemData(null);
    setIsImportingItem(false);
    importRequestIdRef.current += 1;
    editRequestIdRef.current += 1;
    setEditItemError(null);
    setIsSavingItem(false);
    setIsLoadingItemDetails(true);
    const initialImages =
      item.images?.map((image) => ({ id: image.id, url: image.url })) ?? [];
    setEditItemInitialData({
      manufacturer: item.manufacturer,
      model: item.model,
      note: item.note,
      attributes: item.attributes ?? {},
      sourceUrl: item.sourceUrl ?? null,
      images: initialImages,
      defaultImageId: item.defaultImageId ?? null
    });
    setItemBeingEdited(item);
    openItemModal('edit', item.sourceUrl ?? null);

    const requestId = editRequestIdRef.current;

    try {
      const fullItem = await fetchItem(item.id);
      if (editRequestIdRef.current !== requestId) {
        return;
      }
      setItemBeingEdited(fullItem);
      setEditItemInitialData({
        manufacturer: fullItem.manufacturer,
        model: fullItem.model,
        note: fullItem.note,
        attributes: fullItem.attributes ?? {},
        sourceUrl: fullItem.sourceUrl ?? null,
        images:
          fullItem.images?.map((image) => ({
            id: image.id,
            url: image.url
          })) ?? [],
        defaultImageId: fullItem.defaultImageId ?? null
      });
    } catch (error) {
      if (editRequestIdRef.current !== requestId) {
        return;
      }
      const message =
        error instanceof Error && error.message.trim().length
          ? error.message.trim()
          : 'Failed to load item details.';
      setEditItemError(message);
    } finally {
      if (editRequestIdRef.current === requestId) {
        setIsLoadingItemDetails(false);
      }
    }
  };

  const handleModalClose = () => {
    setIsItemModalOpen(false);
    setQuickError(null);
    setImportError(null);
    setImportedItemData(null);
    setIsImportingItem(false);
    importRequestIdRef.current += 1;
    editRequestIdRef.current += 1;
    setItemBeingEdited(null);
    setEditItemInitialData(null);
    setEditItemError(null);
    setIsLoadingItemDetails(false);
    setIsSavingItem(false);
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
    editRequestIdRef.current += 1;
    setItemBeingEdited(null);
    setEditItemInitialData(null);
    setEditItemError(null);
    setIsLoadingItemDetails(false);
    setIsSavingItem(false);
  };

  const handleDescriptionUpdate = async (description: string | null) => {
    await updateProjectMutation.mutateAsync({ description });
  };

  const handleAttributesUpdate = async (attributes: string[]) => {
    await updateProjectMutation.mutateAsync({ attributes });
  };

  const handleCreateItemSubmit = async (payload: ItemFormSubmitPayload) => {
    if (!projectId) {
      throw new Error('Project identifier is missing. Reload the page and try again.');
    }

    setIsSavingItem(true);

    try {
      const createdItem = await createItemMutation.mutateAsync(payload.itemPayload);

      const createdImageIds = new Map<string, string>();
      if (payload.imageChanges.toCreate.length) {
        await Promise.all(
          payload.imageChanges.toCreate.map(async (image) => {
            const created = await createItemImage(createdItem.id, image.url);
            createdImageIds.set(image.id, created.id);
          })
        );
      }

      const { defaultSelection } = payload.imageChanges;
      if (defaultSelection) {
        let resolvedDefaultId: string | null = null;
        if (defaultSelection.type === 'existing') {
          resolvedDefaultId = defaultSelection.id;
        } else {
          const mappedId = createdImageIds.get(defaultSelection.id);
          if (!mappedId) {
            throw new Error('Failed to determine the default image.');
          }
          resolvedDefaultId = mappedId;
        }

        if (resolvedDefaultId) {
          await updateItemMutation.mutateAsync({
            itemId: createdItem.id,
            payload: { defaultImageId: resolvedDefaultId }
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: projectsKeys.items(projectId) });
      await queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleUpdateItemSubmit = async (payload: ItemFormSubmitPayload) => {
    if (!itemBeingEdited) {
      throw new Error('No item selected for editing');
    }

    setIsSavingItem(true);

    try {
      const createdImageIds = new Map<string, string>();

      if (payload.imageChanges.toCreate.length) {
        await Promise.all(
          payload.imageChanges.toCreate.map(async (image) => {
            const created = await createItemImage(itemBeingEdited.id, image.url);
            createdImageIds.set(image.id, created.id);
          })
        );
      }

      const { defaultSelection, toDelete } = payload.imageChanges;
      let resolvedDefaultId: string | null | undefined;

      if (defaultSelection) {
        if (defaultSelection.type === 'existing') {
          resolvedDefaultId = defaultSelection.id;
        } else {
          const mappedId = createdImageIds.get(defaultSelection.id);
          if (!mappedId) {
            throw new Error('Failed to determine the default image.');
          }
          resolvedDefaultId = mappedId;
        }
      } else if (itemBeingEdited.defaultImageId) {
        resolvedDefaultId = null;
      }

      const updatePayload: UpdateItemPayload = {
        manufacturer: payload.itemPayload.manufacturer,
        model: payload.itemPayload.model,
        note: payload.itemPayload.note,
        attributes: payload.itemPayload.attributes,
        sourceUrl: payload.itemPayload.sourceUrl,
        sourceUrlId: payload.itemPayload.sourceUrlId
      };

      if (resolvedDefaultId !== undefined) {
        updatePayload.defaultImageId = resolvedDefaultId;
      }

      await updateItemMutation.mutateAsync({
        itemId: itemBeingEdited.id,
        payload: updatePayload
      });

      if (toDelete.length) {
        const protectedId =
          typeof resolvedDefaultId === 'string' ? resolvedDefaultId : null;
        const targets = protectedId
          ? toDelete.filter((id) => id !== protectedId)
          : toDelete;
        if (targets.length) {
          await Promise.all(targets.map((id) => deleteItemImage(id)));
        }
      }

      if (projectId) {
        await queryClient.invalidateQueries({ queryKey: projectsKeys.items(projectId) });
        await queryClient.invalidateQueries({ queryKey: projectsKeys.detail(projectId) });
      }
    } finally {
      setIsSavingItem(false);
    }
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
      : itemModalMode === 'edit'
        ? editItemInitialData
        : null;

  const itemModalSubmit =
    itemModalMode === 'edit' ? handleUpdateItemSubmit : handleCreateItemSubmit;

  const itemModalIsSubmitting =
    isSavingItem ||
    (itemModalMode === 'edit'
      ? updateItemMutation.isPending
      : createItemMutation.isPending);

  const itemModalInitialDataLoading =
    itemModalMode === 'url'
      ? isImportingItem
      : itemModalMode === 'edit'
        ? isLoadingItemDetails
        : false;

  const itemModalInitialDataError =
    itemModalMode === 'url'
      ? importError
      : itemModalMode === 'edit'
        ? editItemError
        : null;

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
