import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PhotoIcon } from '@shared/assets/icons';
import { getStatusColor, getStatusDisplayText, type BackendOrderStatus } from '@shared/utils/orderStatusHelpers';
import { useApiClient } from '@shared/hooks/useApiClient';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';
import useOrderImages from '@shared/hooks/useOrderImages';
import InputField from '@shared/ui/forms/input/InputField';
import MobilePageHeader from '@app/components/mobile/MobilePageHeader';
import MobileFulfillmentActionTabs from '@app/components/mobile/MobileFulfillmentActionTabs';
import FulfillmentImageUploadModal from '@app/components/fulfillment/FulfillmentImageUploadModal';
import { toast } from 'sonner';
import {
  extractSourceUrlFromOrder,
  fetchFulfillmentOrder,
  formatAddress,
  formatRecipientName,
  getPrimaryItemName,
  getReferenceImage,
  mergeOrderImages,
  REFERENCE_TAG_SUGGESTIONS,
  resolveReferenceProductImage,
  type MobileFulfillmentOrder,
  uploadOrderImageBlob
} from './mobileFulfillmentHelpers';

export default function MobileFulfillmentReferencePage() {
  const { id } = useParams<{ id: string }>();
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const { addOrderImages } = useOrderImages();

  const [order, setOrder] = useState<MobileFulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalInitialImage, setImageModalInitialImage] = useState<string | null>(null);
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchingUrlImage, setFetchingUrlImage] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);

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
      const resolvedProductImage = await resolveReferenceProductImage(apiClient, loadedOrder);
      setProductImage(resolvedProductImage);
      const defaultUrl = extractSourceUrlFromOrder(loadedOrder);
      setFetchUrl(defaultUrl || '');
    } catch (loadError) {
      console.error('Failed to load mobile fulfillment reference order:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [apiClient, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const referenceImage = order ? getReferenceImage(order) : undefined;
  const displayReferenceImage = referenceImage?.url || productImage || null;
  const primaryItemName = order ? getPrimaryItemName(order) : '';
  const primaryItemDescription = order?.orderItems?.[0]?.description?.trim() || '';

  const openReferenceImageModal = () => {
    setImageModalInitialImage(displayReferenceImage);
    setIsImageModalOpen(true);
  };

  const closeReferenceImageModal = () => {
    setIsImageModalOpen(false);
    setImageModalInitialImage(null);
  };

  const handleReferenceImageSave = async ({
    croppedBlob,
    tag,
    note
  }: {
    croppedBlob: Blob;
    category: 'REFERENCE';
    tag?: string;
    note?: string;
  }) => {
    if (!order) {
      throw new Error('Order not loaded');
    }

    const imageUrl = await uploadOrderImageBlob(apiClient, croppedBlob);

    const savedImages = await addOrderImages(order.id, {
      images: [
        {
          url: imageUrl,
          category: 'REFERENCE',
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

    setProductImage(imageUrl);

    toast.success('Reference photo saved');
  };

  const handleFetchImageFromUrl = async () => {
    const sourceUrl = fetchUrl.trim();
    if (!sourceUrl) {
      toast.error('Enter an image page URL first');
      return;
    }

    try {
      setFetchingUrlImage(true);
      const response = await apiClient.get(`/api/wire-products/fetch-image?url=${encodeURIComponent(sourceUrl)}`);
      if (response.status >= 400 || !response.data?.imageUrl) {
        const message =
          response.data && typeof response.data.error === 'string'
            ? response.data.error
            : 'Failed to fetch image from URL';
        throw new Error(message);
      }

      setImageModalInitialImage(response.data.imageUrl as string);
      setIsImageModalOpen(true);
      toast.success('Image fetched. Review crop and save.');
    } catch (fetchError) {
      console.error('Failed to fetch image from URL:', fetchError);
      toast.error(fetchError instanceof Error ? fetchError.message : 'Failed to fetch image from URL');
    } finally {
      setFetchingUrlImage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
          <MobilePageHeader title="Reference" showBackButton backTo="/mobile/fulfillment" />
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
          <MobilePageHeader title="Reference" showBackButton backTo="/mobile/fulfillment" />
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
        <MobilePageHeader title="Reference" showBackButton backTo="/mobile/fulfillment" />
        <MobileFulfillmentActionTabs orderId={order.id} active="reference" />

        <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                #{formatOrderNumber(order.orderNumber, orderNumberPrefix)}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatRecipientName(order)}</p>
              {formatAddress(order) ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatAddress(order)}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                  order.status as BackendOrderStatus
                )}`}
              >
                {getStatusDisplayText(
                  order.status as BackendOrderStatus,
                  order.type === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
                )}
              </span>
            </div>
          </div>
          {order.deliveryDate || order.deliveryTime ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {order.deliveryDate || 'No date'} {order.deliveryTime ? `- ${order.deliveryTime}` : ''}
            </p>
          ) : null}
          {primaryItemName ? (
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{primaryItemName}</p>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Arrangement Reference
          </h2>

          {!displayReferenceImage ? (
            <>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <InputField
                  label="Fetch from URL"
                  placeholder="https://petals.ca/ch77aa-s"
                  value={fetchUrl || ''}
                  onChange={(event) => setFetchUrl(event.target.value)}
                />
                <button
                  type="button"
                  onClick={handleFetchImageFromUrl}
                  disabled={fetchingUrlImage}
                  className="h-11 rounded-xl bg-gray-100 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 sm:mt-[30px]"
                >
                  {fetchingUrlImage ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
              <button
                type="button"
                onClick={openReferenceImageModal}
                className="mb-3 h-9 rounded-xl bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Add Photo
              </button>
            </>
          ) : null}

          {displayReferenceImage ? (
            <div className="space-y-3">
              <img src={displayReferenceImage} alt="Reference arrangement" className="w-full rounded-2xl object-cover" />
              {primaryItemName || primaryItemDescription ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                  {primaryItemName ? (
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{primaryItemName}</p>
                  ) : null}
                  {primaryItemDescription ? (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{primaryItemDescription}</p>
                  ) : null}
                </div>
              ) : null}
              {referenceImage?.tag || referenceImage?.note ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                  {referenceImage?.tag ? (
                    <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">{referenceImage.tag}</p>
                  ) : null}
                  {referenceImage?.note ? (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{referenceImage.note}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <PhotoIcon className="mx-auto mb-2 h-8 w-8" />
              No reference image yet
            </div>
          )}
        </section>
      </div>

      <FulfillmentImageUploadModal
        isOpen={isImageModalOpen}
        onClose={closeReferenceImageModal}
        title="Add Reference Photo"
        submitLabel="Crop & Save"
        categoryOptions={[{ value: 'REFERENCE', label: 'Reference' }]}
        defaultCategory="REFERENCE"
        lockCategory
        tagSuggestions={REFERENCE_TAG_SUGGESTIONS}
        initialImage={imageModalInitialImage}
        onSave={handleReferenceImageSave}
      />
    </div>
  );
}
