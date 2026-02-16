import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronLeftIcon, CameraIcon, PackageIcon, SaveIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import FormError from '@shared/ui/components/ui/form/FormError';
import LoadingButton from '@shared/ui/components/ui/button/LoadingButton';
import useInventory, { InventoryItem } from '@shared/hooks/useInventory';
import { toast } from 'sonner';

export default function MobileInventoryPage() {
  const navigate = useNavigate();
  const { lookup, search, adjustStock } = useInventory({ pageSize: 10 });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockInput, setStockInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // Scanning
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockInput(String(item.stockLevel ?? 0));
    setActionError(null);
    setSearchResults([]);
  };

  const handleDetectedCode = async (value: string) => {
    // Stop scanner immediately to prevent multiple detections
    await stopScanner();
    setScannerOpen(false);

    try {
      const item = await lookup(value);
      selectItem(item);
    } catch (err: any) {
      console.error('Failed to lookup scanned inventory item:', err);
      const message = err?.message || 'Unable to find product for scanned code';
      setActionError(message);
      toast.error(message);
    }
  };

  const startScanner = async () => {
    setScannerError(null);
    setActionError(null);
    setScannerOpen(true);

    // Wait for container to be in DOM
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      scannerRef.current = new Html5Qrcode(scannerContainerId);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Ignore scan failures (no code found in frame)
        }
      );
    } catch (error) {
      console.error('Failed to start camera scanner:', error);
      setScannerError('Camera access failed. Allow camera permissions and try again.');
      toast.error('Camera access failed. Allow camera permissions and try again.');
      setScannerOpen(false);
      await stopScanner();
    }
  };

  const closeScanner = async () => {
    setScannerOpen(false);
    await stopScanner();
  };

  const handleManualSearch = async () => {
    const query = manualQuery.trim();
    if (!query) return;

    setActionError(null);
    setSearchResults([]);

    try {
      const exact = await lookup(query);
      selectItem(exact);
      return;
    } catch {
      // Fall back to fuzzy search when exact lookup fails.
    }

    try {
      const results = await search(query, 10);
      if (results.length === 0) {
        setActionError('No inventory items matched your search.');
        toast.error('No inventory items matched your search');
        return;
      }
      setSearchResults(results);
    } catch (err: any) {
      console.error('Failed manual inventory search:', err);
      const message = err?.message || 'Failed to search inventory';
      setActionError(message);
      toast.error(message);
    }
  };

  const handleStockDelta = (delta: number) => {
    const current = Number.parseInt(stockInput || '0', 10);
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
    setStockInput(String(next));
  };

  const handleSaveStock = async () => {
    if (!selectedItem) return;

    const parsedStock = Number.parseInt(stockInput, 10);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setActionError('Enter a valid stock level (0 or greater).');
      toast.error('Enter a valid stock level (0 or greater)');
      return;
    }

    try {
      setSaving(true);
      setActionError(null);
      const updated = await adjustStock(selectedItem.variantId, { stockLevel: parsedStock });
      setSelectedItem(updated);
      setStockInput(String(updated.stockLevel ?? 0));
      toast.success('Stock updated');
    } catch (err: any) {
      console.error('Failed to save stock adjustment:', err);
      const message = err?.message || 'Failed to save stock adjustment';
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleScanAnother = () => {
    setSelectedItem(null);
    setStockInput('');
    setManualQuery('');
    setSearchResults([]);
    startScanner();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <div className="bg-white dark:bg-gray-900 shadow-sm p-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/mobile')}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          aria-label="Back to mobile home"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Scan or search products and update stock</p>
        </div>
        <div className="ml-auto w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
          <PackageIcon className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="flex-1 p-6 space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 space-y-4">
          <button
            onClick={startScanner}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold"
          >
            <CameraIcon className="w-5 h-5" />
            Scan Code
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <InputField
              label="Search SKU/Barcode or Name"
              placeholder="012345678901 or rose"
              value={manualQuery || ''}
              onChange={(event) => setManualQuery(event.target.value)}
            />
            <button
              onClick={handleManualSearch}
              className="h-11 mt-[30px] px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Search
            </button>
          </div>
        </div>

        {(scannerError || actionError) && <FormError error={scannerError || actionError} />}

        {scannerOpen ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Camera Scanner</h2>
              <button
                onClick={closeScanner}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
            <div id={scannerContainerId} className="rounded-xl overflow-hidden" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Point the camera at a QR code or barcode.
            </p>
          </div>
        ) : null}

        {searchResults.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Search Results</h2>
            {searchResults.map((item) => (
              <button
                key={item.variantId}
                onClick={() => selectItem(item)}
                className="w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-brand-400"
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.productName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.variantName} | {item.sku}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {selectedItem ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.productName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {selectedItem.productName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{selectedItem.variantName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {selectedItem.sku}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300">
              Current stock: <span className="font-semibold text-gray-900 dark:text-white">{selectedItem.stockLevel ?? 0}</span>
            </div>

            <InputField
              label="New Stock Level"
              type="number"
              min="0"
              value={stockInput || ''}
              onChange={(event) => setStockInput(event.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStockDelta(-1)}
                className="h-11 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                -1
              </button>
              <button
                onClick={() => handleStockDelta(1)}
                className="h-11 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                +1
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LoadingButton
                onClick={handleSaveStock}
                loading={saving}
                loadingText="Saving..."
                icon={<SaveIcon className="w-4 h-4" />}
              >
                Save
              </LoadingButton>

              <button
                onClick={handleScanAnother}
                className="h-11 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium"
              >
                Scan Another
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
