import { useCallback, useEffect, useMemo, useState } from 'react';
import { PhotoIcon } from '@shared/assets/icons';
import { useApiClient } from '@shared/hooks/useApiClient';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';
import useOrderImages, { type OrderImage, type OrderImageCategory } from '@shared/hooks/useOrderImages';
import MobilePageHeader from '@app/components/mobile/MobilePageHeader';
import MobileFulfillmentActionTabs from '@app/components/mobile/MobileFulfillmentActionTabs';
import FulfillmentImageUploadModal from '@app/components/fulfillment/FulfillmentImageUploadModal';
import { toast } from 'sonner';
import {
  fetchFulfillmentOrder,
  formatAddress,
  formatRecipientName,
  getPrimaryItemName,
  mergeOrderImages,
  RESULT_IMAGE_CATEGORY_OPTIONS,
  RESULT_IMAGE_CATEGORY_VALUES,
  RESULT_TAG_SUGGESTIONS,
  type MobileFulfillmentOrder,
  uploadOrderImageBlob
} from './mobileFulfillmentHelpers';
import { useParams } from 'react-router-dom';

type ResultImageSection = {
  category: OrderImageCategory;
  label: string;
  images: OrderImage[];
};

const getSectionLabel = (category: OrderImageCategory): string => {
  switch (category) {
    case 'FULFILLED':
      return 'Fulfilled';
    case 'DELIVERED':
      return 'Delivered';
    case 'OTHER':
      return 'Other';
    default:
      return category;
  }
};

export default function MobileFulfillmentPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const { addOrderImages, deleteOrderImage } = useOrderImages();

  const [order, setOrder] = useState<MobileFulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError('Order not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const loadedOrder = await fetchFulfillmentOrder(apiClient, id);
      setOrder(loadedOrder);
    } catch (loadError) {
      console.error('Failed to load mobile fulfillment photos order:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [apiClient, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const sections = useMemo<ResultImageSection[]>(() => {
    const orderImages = order?.orderImages || [];
    return RESULT_IMAGE_CATEGORY_VALUES.map((category) => ({
      category,
      label: getSectionLabel(category),
      images: orderImages.filter((image) => image.category === category)
    }));
  }, [order]);

  const primaryItemName = order ? getPrimaryItemName(order) : '';

  const handleImageSave = async ({
    croppedBlob,
    category,
    tag,
    note
  }: {
    croppedBlob: Blob;
    category: OrderImageCategory;
    tag?: string;
    note?: string;
  }) => {
    if (!order) {
      throw new Error('Order not loaded');
    }

    const safeCategory = RESULT_IMAGE_CATEGORY_VALUES.includes(category) ? category : 'FULFILLED';
    const imageUrl = await uploadOrderImageBlob(apiClient, croppedBlob);
    const savedImages = await addOrderImages(order.id, {
      images: [
        {
          url: imageUrl,
          category: safeCategory,
          tag: tag || null,
          note: note || null
        }
      ]
    });

    setOrder((previous) =>
      previous
        ? {
            ...previous,
            orderImages: mergeOrderImages(previous.orderImages || [], savedImages)
          }
        : previous
    );

    toast.success('Photo saved');
  };

  const handleRemoveImage = async (image: OrderImage) => {
    if (!order) return;

    try {
      setDeletingImageId(image.id);
      await deleteOrderImage(order.id, image.id);
      setOrder((previous) =>
        previous
          ? {
              ...previous,
              orderImages: (previous.orderImages || []).filter((item) => item.id !== image.id)
            }
          : previous
      );
      toast.success('Photo removed');
    } catch (removeError) {
      console.error('Failed to remove fulfillment image:', removeError);
      toast.error(removeError instanceof Error ? removeError.message : 'Failed to remove photo');
    } finally {
      setDeletingImageId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
          <MobilePageHeader title="Photos" showBackButton backTo="/mobile/fulfillment" />
          <div className="rounded-3xl bg-white p-5 text-sm text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
            Loading order...
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
          <MobilePageHeader title="Photos" showBackButton backTo="/mobile/fulfillment" />
          <div className="rounded-3xl bg-white p-5 text-sm text-red-600 shadow-sm dark:bg-gray-800 dark:text-red-300">
            {error || 'Order not found'}
          </div>
          <button
            type="button"
            onClick={loadOrder}
            className="h-11 w-full rounded-2xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md px-4 py-5 space-y-5">
        <MobilePageHeader title="Photos" showBackButton backTo="/mobile/fulfillment" />
        <MobileFulfillmentActionTabs orderId={order.id} active="photos" />

        <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            #{formatOrderNumber(order.orderNumber, orderNumberPrefix)}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatRecipientName(order)}</p>
          {formatAddress(order) ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatAddress(order)}</p> : null}
          {primaryItemName ? (
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{primaryItemName}</p>
          ) : null}
        </section>

        {sections.map((section) => (
          <section key={section.category} className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {section.label} Photos
            </h2>

            {section.images.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No {section.label.toLowerCase()} photos yet.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {section.images.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => window.open(image.url, '_blank')}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        window.open(image.url, '_blank');
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveImage(image);
                      }}
                      disabled={deletingImageId === image.id}
                      className="absolute right-1.5 top-1.5 z-10 h-6 w-6 rounded-full bg-black/70 text-xs text-white hover:bg-black/80 disabled:opacity-60"
                    >
                      X
                    </button>
                    <img
                      src={image.url}
                      alt={`${section.label} fulfillment`}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {image.tag || image.note ? (
                      <div className="border-t border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800">
                        {image.tag ? (
                          <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">{image.tag}</p>
                        ) : null}
                        {image.note ? (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300">{image.note}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        <button
          type="button"
          onClick={() => setImageModalOpen(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <PhotoIcon className="h-4 w-4" />
          Add Photo
        </button>
      </div>

      <FulfillmentImageUploadModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Add Fulfillment Photo"
        submitLabel="Crop & Save"
        categoryOptions={RESULT_IMAGE_CATEGORY_OPTIONS}
        defaultCategory="FULFILLED"
        tagSuggestions={RESULT_TAG_SUGGESTIONS}
        onSave={handleImageSave}
      />
    </div>
  );
}
