import { useCallback, useEffect, useId, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Modal } from '@shared/ui/components/ui/modal';
import LoadingButton from '@shared/ui/components/ui/button/LoadingButton';
import Select from '@shared/ui/forms/Select';
import TextArea from '@shared/ui/forms/input/TextArea';
import { fileToDataURL } from '@shared/utils/cloudflareR2Service';
import type { OrderImageCategory } from '@shared/hooks/useOrderImages';
import { toast } from 'sonner';

interface CategoryOption {
  value: OrderImageCategory;
  label: string;
}

interface FulfillmentImageUploadModalProps {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  categoryOptions: CategoryOption[];
  defaultCategory: OrderImageCategory;
  lockCategory?: boolean;
  tagSuggestions?: string[];
  initialImage?: string | null;
  onClose: () => void;
  onSave: (payload: {
    croppedBlob: Blob;
    category: OrderImageCategory;
    tag?: string;
    note?: string;
  }) => Promise<void>;
}

const FILE_INPUT_ID = 'fulfillment-image-upload-input';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

const getCroppedImageBlob = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to crop image');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Could not generate cropped image'));
      },
      'image/jpeg',
      0.95
    );
  });
};

export default function FulfillmentImageUploadModal({
  isOpen,
  title,
  submitLabel,
  categoryOptions,
  defaultCategory,
  lockCategory = false,
  tagSuggestions = [],
  initialImage = null,
  onClose,
  onSave
}: FulfillmentImageUploadModalProps) {
  const tagSuggestionListId = useId();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [category, setCategory] = useState<OrderImageCategory>(defaultCategory);
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setImageSrc(initialImage || null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCategory(defaultCategory);
    setTag('');
    setNote('');
    setError(null);
  }, [isOpen, initialImage, defaultCategory]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelection = async (file: File | null) => {
    if (!file) return;

    try {
      const imageDataUrl = await fileToDataURL(file);
      setImageSrc(imageDataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setError(null);
    } catch (fileError) {
      console.error('Failed to load image file:', fileError);
      toast.error('Failed to load image');
    }
  };

  const handleSave = async () => {
    if (!imageSrc) {
      setError('Choose an image first.');
      return;
    }

    if (!croppedAreaPixels) {
      setError('Adjust the crop area before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const croppedBlob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);

      await onSave({
        croppedBlob,
        category,
        tag: tag.trim() || undefined,
        note: note.trim() || undefined
      });

      onClose();
    } catch (saveError) {
      console.error('Failed to save image:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save image');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[calc(100vw-1rem)] max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] flex-col sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <h2 className="pr-12 text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">{title}</h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <button
              type="button"
              onClick={() => document.getElementById(FILE_INPUT_ID)?.click()}
              className="h-11 px-4 bg-brand-500 text-white rounded-lg hover:bg-brand-600 sm:h-auto sm:py-2"
            >
              Choose Photo
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              All photos are cropped to a square before saving.
            </p>
          </div>

          <input
            id={FILE_INPUT_ID}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              handleFileSelection(file);
              event.target.value = '';
            }}
          />

          {imageSrc ? (
            <div className="relative h-[250px] rounded-lg overflow-hidden bg-gray-900 sm:h-[320px] md:h-[360px]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : (
            <div className="h-[180px] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 sm:h-[220px]">
              Select an image to crop.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(value) => setCategory(value as OrderImageCategory)}
            disabled={lockCategory}
            placeholder="Select category"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tag (optional)
            </label>
            <input
              type="text"
              list={tagSuggestions.length > 0 ? tagSuggestionListId : undefined}
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              maxLength={80}
              placeholder="Type a tag or pick a suggestion"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:ring-[#597485]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
            {tagSuggestions.length > 0 && (
              <datalist id={tagSuggestionListId}>
                {tagSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            )}
          </div>

          <TextArea
            label="Note (optional)"
            value={note || ''}
            onChange={setNote}
            rows={3}
            placeholder="Add a note for this photo"
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
              disabled={saving}
            >
              Cancel
            </button>
            <LoadingButton
              type="button"
              onClick={handleSave}
              loading={saving}
              loadingText="Saving..."
              variant="primary"
              className="h-11"
            >
              {submitLabel}
            </LoadingButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
