import { useCallback, useEffect, useMemo, useState } from 'react';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import LoadingButton from '@shared/ui/components/ui/button/LoadingButton';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { useApiClient } from '@shared/hooks/useApiClient';
import { CopyIcon, DownloadIcon, LinkIcon } from '@shared/assets/icons';
import QRCode from 'qrcode/lib/browser';

const DEFAULT_DISCOUNT_TYPE = 'FIXED_AMOUNT';
const DEFAULT_DISCOUNT_VALUE = 10;
const DEFAULT_EXPIRY_DAYS = 365;
const PUBLIC_WWW_BASE = (import.meta.env.VITE_WWW_URL || 'https://www.hellobloom.ca').replace(/\/$/, '');

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' },
  { value: 'PERCENTAGE', label: 'Percentage (%)' }
];

type GiftDiscount = {
  id: string;
  code: string;
  discountType: string;
  value: number;
  createdAt: string;
  endDate?: string | null;
  usageCount?: number | null;
  usageLimit?: number | null;
  enabled: boolean;
};

const generateCode = () => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `GIFT-${code}`;
};

const buildGiftLink = (code: string) => `${PUBLIC_WWW_BASE}/gift?code=${encodeURIComponent(code)}`;

export default function BirthdayGiftsPage() {
  const apiClient = useApiClient();
  const [discountType, setDiscountType] = useState<string>(DEFAULT_DISCOUNT_TYPE);
  const [discountValue, setDiscountValue] = useState<number>(DEFAULT_DISCOUNT_VALUE);
  const [expiryDays, setExpiryDays] = useState<number>(DEFAULT_EXPIRY_DAYS);
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GiftDiscount | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [list, setList] = useState<GiftDiscount[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  }, [currentPage, list]);

  const handleGenerateQR = async (url: string) => {
    const dataUrl = await QRCode.toDataURL(url, { width: 420, margin: 1 });
    setQrDataUrl(dataUrl);
  };

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await apiClient.get('/api/discounts/qr?limit=200');
      const data = Array.isArray(response.data) ? response.data : [];
      setList(data);
    } catch (err: any) {
      setListError(err?.message || 'Failed to load gift QR codes');
    } finally {
      setListLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSubmit = async () => {
    const codeToUse = couponCode.trim() || generateCode();
    setLoading(true);
    setError(null);
    setResult(null);
    setQrDataUrl(null);

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (expiryDays || DEFAULT_EXPIRY_DAYS));

      const response = await apiClient.post('/api/discounts', {
        name: 'Gift QR',
        description: 'QR gift coupon',
        code: codeToUse,
        discountType,
        triggerType: 'COUPON_CODE',
        value: discountValue,
        usageLimit: 1,
        perCustomerLimit: 1,
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        autoApply: false,
        stackable: false,
        enabled: true,
        webOnly: true,
        posOnly: false
      });

      const data: GiftDiscount = response.data;
      setResult(data);
      setCouponCode(data.code || codeToUse);
      await handleGenerateQR(buildGiftLink(data.code || codeToUse));
      setCurrentPage(1);
      fetchList();
    } catch (err: any) {
      setError(err?.message || 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text?: string | null) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `gift-qr-${result?.code || 'qr'}.png`;
    a.click();
  };

  const handleRowDownload = async (code: string) => {
    const dataUrl = await QRCode.toDataURL(buildGiftLink(code), { width: 420, margin: 1 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `gift-qr-${code}.png`;
    a.click();
  };

  const columns: ColumnDef<GiftDiscount>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        render: (row) => <span className="font-mono text-xs">{row.code}</span>
      },
      {
        key: 'type',
        header: 'Type',
        render: (row) => (row.discountType === 'PERCENTAGE' ? 'Percent' : 'Fixed')
      },
      {
        key: 'value',
        header: 'Value',
        render: (row) =>
          row.discountType === 'PERCENTAGE' ? `${row.value}%` : `$${row.value}`
      },
      {
        key: 'created',
        header: 'Created',
        render: (row) => new Date(row.createdAt).toLocaleDateString('en-CA')
      },
      {
        key: 'expires',
        header: 'Expires',
        render: (row) => (row.endDate ? new Date(row.endDate).toLocaleDateString('en-CA') : '—')
      },
      {
        key: 'used',
        header: 'Used',
        render: (row) => `${row.usageCount ?? 0}/${row.usageLimit ?? '∞'}`
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleCopy(row.code)}
              title="Copy code"
            >
              <CopyIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleCopy(buildGiftLink(row.code))}
              title="Copy link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleRowDownload(row.code)}
              title="Download QR"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          </div>
        )
      }
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      <PageBreadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Gift QR Codes</h1>
          <p className="text-sm text-gray-500">Generate unique coupons and reprint QR codes.</p>
        </div>
      </div>

      <ComponentCard title="Create coupon + QR">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Coupon code (optional)"
            placeholder="GIFT-XXXX"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
          <Select
            label="Discount type"
            value={discountType}
            options={DISCOUNT_TYPE_OPTIONS}
            onChange={(value) => setDiscountType(value)}
          />
          <InputField
            label={discountType === 'PERCENTAGE' ? 'Percent off' : 'Amount off (dollars)'}
            type="number"
            min={1}
            max={discountType === 'PERCENTAGE' ? 100 : 500}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
          />
          <InputField
            label="Expiry (days)"
            type="number"
            min={1}
            max={365}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            loadingText="Creating..."
            variant="primary"
          >
            Create QR
          </LoadingButton>
          <button
            type="button"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
            onClick={() => {
              setCouponCode('');
              setDiscountType(DEFAULT_DISCOUNT_TYPE);
              setDiscountValue(DEFAULT_DISCOUNT_VALUE);
              setExpiryDays(DEFAULT_EXPIRY_DAYS);
              setError(null);
            }}
          >
            Reset
          </button>
        </div>
      </ComponentCard>

      {result && (
        <ComponentCard
          title="Latest QR"
          desc="Copy the code or download the QR image."
          headerAction={
            result?.code ? (
              <button
                type="button"
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-primary"
                onClick={() => handleCopy(buildGiftLink(result.code))}
              >
                Copy link
              </button>
            ) : null
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <div>
                  <p className="text-xs uppercase text-gray-500">Coupon code</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{result.code}</p>
                </div>
                <button
                  className="text-sm font-semibold text-primary"
                  onClick={() => handleCopy(result.code)}
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
                <div>
                  <p className="text-xs uppercase text-gray-500">Landing URL</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{buildGiftLink(result.code)}</p>
                </div>
                <button
                  className="text-sm font-semibold text-primary"
                  onClick={() => handleCopy(buildGiftLink(result.code))}
                >
                  Copy
                </button>
              </div>

              {result.endDate && (
                <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                  Expires {new Date(result.endDate).toLocaleDateString('en-CA')}
                </div>
              )}

              <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
                Value: {result.discountType === 'PERCENTAGE' ? `${result.value}% off` : `$${result.value} off`}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700">
              {qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="Gift QR" className="w-60 h-60 object-contain" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                      onClick={() => handleCopy(qrDataUrl)}
                    >
                      Copy QR data
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
                      onClick={handleDownloadQR}
                    >
                      Download PNG
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">QR will appear after creation.</p>
              )}
            </div>
          </div>
        </ComponentCard>
      )}

      <ComponentCard
        title="Recent QR codes"
        desc="Latest generated codes (newest first)."
        headerAction={
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
            onClick={fetchList}
          >
            Refresh
          </button>
        }
      >
        <StandardTable
          columns={columns}
          data={paginatedList}
          loading={listLoading}
          emptyState={{
            message: listError ? `Failed to load QR codes: ${listError}` : 'No QR codes created yet.'
          }}
          pagination={{
            currentPage,
            totalItems: list.length,
            itemsPerPage,
            onPageChange: setCurrentPage
          }}
        />
      </ComponentCard>
    </div>
  );
}
