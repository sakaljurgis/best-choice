import { useCallback, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Item, ItemStatus } from '@shared/models/item';
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
import { ItemImageGalleryOverlay, type GalleryImage } from './item-image-gallery-overlay';
import { ItemStatusModal } from './item-status-modal';

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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalItem, setStatusModalItem] = useState<Item | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryItemName, setGalleryItemName] = useState('');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState(0);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const galleryCacheRef = useRef(
    new Map<string, { images: GalleryImage[]; defaultImageId: string | null }>()
  );
  const galleryRequestIdRef = useRef(0);

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

  const handleViewItemImages = useCallback(
    async (item: Item) => {
      const displayName = item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model;

      galleryRequestIdRef.current += 1;
      const requestId = galleryRequestIdRef.current;

      const cached = galleryCacheRef.current.get(item.id);
      const fallbackImages =
        item.images && item.images.length
          ? item.images.map((image) => ({ id: image.id, url: image.url }))
          : [];

      let initialImages = cached?.images ?? fallbackImages;

      if (!initialImages.length && item.defaultImageUrl) {
        initialImages = [
          {
            id: item.defaultImageId ?? 'default-image',
            url: item.defaultImageUrl
          }
        ];
      }

      const initialDefaultId = cached?.defaultImageId ?? item.defaultImageId ?? null;

      setIsGalleryOpen(true);
      setGalleryItemName(displayName);
      setGalleryError(null);
      setGalleryImages(initialImages);
      setIsGalleryLoading(!cached && initialImages.length === 0);

      if (initialImages.length) {
        if (initialDefaultId) {
          const defaultIndex = initialImages.findIndex((image) => image.id === initialDefaultId);
          setGalleryActiveIndex(defaultIndex >= 0 ? defaultIndex : 0);
        } else {
          setGalleryActiveIndex(0);
        }
      } else {
        setGalleryActiveIndex(0);
      }

      if (cached) {
        return;
      }

      try {
        const fullItem = await fetchItem(item.id);
        if (galleryRequestIdRef.current !== requestId) {
          return;
        }

        const normalizedImages =
          fullItem.images?.map((image) => ({
            id: image.id,
            url: image.url
          })) ?? [];
        const defaultId = fullItem.defaultImageId ?? null;

        galleryCacheRef.current.set(item.id, {
          images: normalizedImages,
          defaultImageId: defaultId
        });

        setGalleryImages(normalizedImages);

        if (normalizedImages.length) {
          const resolvedIndex = defaultId
            ? normalizedImages.findIndex((image) => image.id === defaultId)
            : -1;
          setGalleryActiveIndex(resolvedIndex >= 0 ? resolvedIndex : 0);
        } else {
          setGalleryActiveIndex(0);
        }
        setGalleryError(null);
      } catch (error) {
        if (galleryRequestIdRef.current !== requestId) {
          return;
        }

        const message =
          error instanceof Error && error.message.trim().length
            ? error.message.trim()
            : 'Failed to load item images.';
        setGalleryError(message);
      } finally {
        if (galleryRequestIdRef.current === requestId) {
          setIsGalleryLoading(false);
        }
      }
    },
    []
  );

  const handleCloseGallery = useCallback(() => {
    galleryRequestIdRef.current += 1;
    setIsGalleryOpen(false);
    setIsGalleryLoading(false);
    setGalleryError(null);
  }, []);

  const handleGalleryNext = useCallback(() => {
    setGalleryActiveIndex((current) => {
      if (galleryImages.length <= 1) {
        return current;
      }
      return (current + 1) % galleryImages.length;
    });
  }, [galleryImages]);

  const handleGalleryPrevious = useCallback(() => {
    setGalleryActiveIndex((current) => {
      if (galleryImages.length <= 1) {
        return current;
      }
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  }, [galleryImages]);

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

  const handleOpenItemStatusModal = (item: Item) => {
    setStatusModalItem(item);
    setStatusModalError(null);
    setIsStatusModalOpen(true);
  };

  const handleCloseItemStatusModal = () => {
    if (isSavingStatus) {
      return;
    }
    setIsStatusModalOpen(false);
    setStatusModalError(null);
    setStatusModalItem(null);
  };

  const handleSubmitItemStatus = async ({
    status,
    note
  }: {
    status: ItemStatus;
    note: string | null;
  }) => {
    if (!statusModalItem) {
      return;
    }

    setIsSavingStatus(true);
    setStatusModalError(null);
    try {
      await updateItemMutation.mutateAsync({
        itemId: statusModalItem.id,
        payload: { status, note }
      });
      setIsStatusModalOpen(false);
      setStatusModalItem(null);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length
          ? error.message.trim()
          : 'Failed to update item.';
      setStatusModalError(message);
    } finally {
      setIsSavingStatus(false);
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
        onEditItemStatus={handleOpenItemStatusModal}
        projectId={projectId}
        onViewItemImages={handleViewItemImages}
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

      <ItemImageGalleryOverlay
        isOpen={isGalleryOpen}
        itemName={galleryItemName}
        images={galleryImages}
        activeIndex={galleryActiveIndex}
        isLoading={isGalleryLoading}
        error={galleryError}
        onClose={handleCloseGallery}
        onNext={handleGalleryNext}
        onPrevious={handleGalleryPrevious}
      />

      <ItemStatusModal
        isOpen={isStatusModalOpen}
        item={statusModalItem}
        onClose={handleCloseItemStatusModal}
        onSubmit={handleSubmitItemStatus}
        isSubmitting={isSavingStatus || updateItemMutation.isPending}
        errorMessage={statusModalError}
      />
    </div>
  );
}
