import { useEffect, useMemo, useState } from 'react';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import FormError from '@shared/ui/components/ui/form/FormError';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { formatCurrency } from '@shared/utils/currency';
import useInventory, { InventoryItem } from '@shared/hooks/useInventory';
import QuickAdjustModal from '@app/components/inventory/QuickAdjustModal';
import PrintInventoryModal from '@app/components/inventory/PrintInventoryModal';
import PrintLabelsModal from '@app/components/inventory/PrintLabelsModal';

const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
    />
  </svg>
);

const QrIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 13.5h1.5v1.5h-1.5zM13.5 16.5h1.5v3h-1.5zM16.5 18h3v1.5h-3zM18 15h1.5v1.5H18z" />
  </svg>
);

const TagIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 6.75h.008v.008H16.5V6.75zm2.25 2.25L12 15.75l-6.75-6.75L12 2.25l6.75 6.75z"
    />
  </svg>
);

const getStockStatus = (item: InventoryItem) => {
  if (!item.trackInventory) {
    return { color: 'text-gray-500', label: 'Not Tracked' };
  }

  const stock = item.stockLevel ?? 0;
  if (stock <= 0) {
    return { color: 'text-red-500', label: 'Out' };
  }

  if (stock <= 5) {
    return { color: 'text-yellow-500', label: 'Low' };
  }

  return { color: 'text-green-500', label: 'In Stock' };
};

export default function InventoryPage() {
  const {
    items,
    categories,
    loading,
    error,
    filters,
    pagination,
    setFilters,
    adjustStock,
    bulkAdjust,
    getQrCode,
    generateReport,
    printLabels,
  } = useInventory();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inlineUpdatingId, setInlineUpdatingId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showQuickAdjustModal, setShowQuickAdjustModal] = useState(false);
  const [showPrintInventoryModal, setShowPrintInventoryModal] = useState(false);
  const [showPrintLabelsModal, setShowPrintLabelsModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.variantId)),
    [items, selectedIds]
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(items.map((item) => item.variantId));
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      return next;
    });
  }, [items]);

  const toggleSelected = (variantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  };

  const handleInlineAdjust = async (item: InventoryItem, delta: number) => {
    try {
      setInlineUpdatingId(item.variantId);
      setActionError(null);
      await adjustStock(item.variantId, { delta });
    } catch (err: any) {
      console.error('Failed inline stock adjustment:', err);
      setActionError(err?.message || 'Failed to adjust stock');
    } finally {
      setInlineUpdatingId(null);
    }
  };

  const handleOpenQuickAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowQuickAdjustModal(true);
  };

  const handleBulkDelta = async (delta: number) => {
    if (selectedItems.length === 0) return;

    try {
      setBulkUpdating(true);
      setActionError(null);
      await bulkAdjust(
        selectedItems.map((item) => ({
          variantId: item.variantId,
          delta,
        }))
      );
    } catch (err: any) {
      console.error('Failed bulk stock adjustment:', err);
      setActionError(err?.message || 'Failed bulk adjustment');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleGenerateInventoryReport = async (options: {
    categoryId?: string;
    lowStockOnly?: boolean;
    sortBy?: 'name' | 'sku' | 'stock';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const report = await generateReport(options);
    if (report.pdfUrl) {
      window.open(report.pdfUrl, '_blank');
    }
  };

  const handlePrintLabels = async (labels: Array<{ variantId: string; quantity: number }>) => {
    try {
      setActionError(null);
      const result = await printLabels(labels);
      if (result.action === 'queued') {
        // Success - job sent to print agent
      } else if (result.action === 'skipped') {
        setActionError('Label printing is disabled. Enable it in Settings → Print Settings.');
      }
    } catch (err: any) {
      console.error('Failed to print labels:', err);
      setActionError(err?.message || 'Failed to send labels to printer');
    }
  };

  const handleOpenQr = async (item: InventoryItem) => {
    try {
      setActionError(null);
      const qr = await getQrCode(item.variantId);
      if (qr.qrCode) {
        window.open(qr.qrCode, '_blank');
      }
    } catch (err: any) {
      console.error('Failed to generate QR code:', err);
      setActionError(err?.message || 'Failed to generate QR code');
    }
  };

  const handlePrintSingleLabel = async (item: InventoryItem) => {
    try {
      setActionError(null);
      const result = await printLabels([{ variantId: item.variantId, quantity: 1 }]);
      if (result.action === 'skipped') {
        setActionError('Label printing is disabled. Enable it in Settings → Print Settings.');
      }
    } catch (err: any) {
      console.error('Failed to print single label:', err);
      setActionError(err?.message || 'Failed to send label to printer');
    }
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'select',
      header: 'Select',
      className: 'w-[80px]',
      render: (item) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            toggleSelected(item.variantId);
          }}
          className={`h-8 w-8 rounded-md border transition-colors ${
            selectedIds.has(item.variantId)
              ? 'bg-brand-500 border-brand-500 text-white'
              : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
          }`}
          title={selectedIds.has(item.variantId) ? 'Deselect row' : 'Select row'}
        >
          {selectedIds.has(item.variantId) ? '✓' : ''}
        </button>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      className: 'w-[130px]',
      render: (item) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.sku}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      className: 'w-[260px]',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.productName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.price)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'variant',
      header: 'Variant',
      className: 'w-[180px]',
      render: (item) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">{item.variantName}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'w-[170px]',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleInlineAdjust(item, -1);
            }}
            disabled={inlineUpdatingId === item.variantId}
            className="h-8 w-8 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
            title="Decrease stock"
          >
            -
          </button>
          <span className="min-w-[42px] text-center text-sm font-medium text-gray-900 dark:text-white">
            {inlineUpdatingId === item.variantId ? '...' : item.trackInventory ? item.stockLevel ?? 0 : 'N/T'}
          </span>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleInlineAdjust(item, 1);
            }}
            disabled={inlineUpdatingId === item.variantId}
            className="h-8 w-8 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
            title="Increase stock"
          >
            +
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[140px]',
      render: (item) => {
        const status = getStockStatus(item);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${status.color}`}>•</span>
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[150px]',
      render: (item) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleOpenQuickAdjust(item);
            }}
            className="text-gray-400 hover:text-brand-600 transition-colors"
            title="Quick adjust"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handlePrintSingleLabel(item);
            }}
            className="text-gray-400 hover:text-green-600 transition-colors"
            title="Print label"
          >
            <TagIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleOpenQr(item);
            }}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Open QR code"
          >
            <QrIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage stock levels, generate count sheets, and print labels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintInventoryModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm font-medium rounded-lg transition-colors"
          >
            Print Inventory
          </button>
          <button
            onClick={() => setShowPrintLabelsModal(true)}
            disabled={selectedIds.size === 0}
            className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Print Labels ({selectedIds.size})
          </button>
        </div>
      </div>

      {(error || actionError) && <FormError error={actionError || error} className="mb-4" />}

      <ComponentCard>
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkDelta(-1)}
              disabled={selectedItems.length === 0 || bulkUpdating}
              className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200 disabled:cursor-not-allowed"
            >
              -1 Selected
            </button>
            <button
              onClick={() => handleBulkDelta(1)}
              disabled={selectedItems.length === 0 || bulkUpdating}
              className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200 disabled:cursor-not-allowed"
            >
              +1 Selected
            </button>
            {bulkUpdating ? (
              <span className="text-sm text-gray-500 dark:text-gray-400">Updating selected items...</span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Search"
              placeholder="Search by SKU, product, or variant..."
              value={filters.search || ''}
              onChange={(event) => setFilters({ search: event.target.value, page: 1 })}
            />

            <Select
              label="Category"
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.depth ? `${'-- '.repeat(category.depth)}${category.name}` : category.name,
                })),
              ]}
              value={filters.categoryId || ''}
              onChange={(value) => setFilters({ categoryId: value || '', page: 1 })}
            />

            <Select
              label="Stock Filter"
              options={[
                { value: 'false', label: 'All Inventory' },
                { value: 'true', label: 'Low Stock Only' },
              ]}
              value={filters.lowStockOnly ? 'true' : 'false'}
              onChange={(value) => setFilters({ lowStockOnly: value === 'true', page: 1 })}
            />
          </div>
        </div>

        <StandardTable
          columns={columns}
          data={items}
          loading={loading}
          emptyState={{ message: 'No inventory items found' }}
          onRowClick={handleOpenQuickAdjust}
          pagination={{
            currentPage: pagination.page,
            itemsPerPage: pagination.pageSize,
            totalItems: pagination.totalItems,
            onPageChange: (page) => setFilters({ page }),
          }}
        />
      </ComponentCard>

      <QuickAdjustModal
        isOpen={showQuickAdjustModal}
        item={selectedItem}
        onClose={() => setShowQuickAdjustModal(false)}
        onSave={async (variantId, stockLevel) => {
          await adjustStock(variantId, { stockLevel });
        }}
      />

      <PrintInventoryModal
        isOpen={showPrintInventoryModal}
        categories={categories}
        onClose={() => setShowPrintInventoryModal(false)}
        onGenerate={handleGenerateInventoryReport}
      />

      <PrintLabelsModal
        isOpen={showPrintLabelsModal}
        selectedItems={selectedItems}
        onClose={() => setShowPrintLabelsModal(false)}
        onGenerate={handlePrintLabels}
      />
    </div>
  );
}
