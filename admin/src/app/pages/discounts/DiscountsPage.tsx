import { useState } from 'react';
import PageMeta from '@shared/ui/common/PageMeta';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import DiscountList from '@app/components/discounts/DiscountList';
import CreateDiscountModal from '@app/components/discounts/CreateDiscountModal';

export default function DiscountsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDiscountCreated = () => {
    setShowCreateModal(false);
    setEditingDiscount(null);
    setRefreshKey(prev => prev + 1); // Refresh the discount list
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingDiscount(null);
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setShowCreateModal(true);
  };

  const handleDeleteDiscount = (discountId) => {
    setRefreshKey(prev => prev + 1); // Refresh the discount list
  };

  return (
    <div className="p-6">
      <PageMeta title="Discounts" />
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Discounts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage all your discounts and coupons in one place
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Discount
        </button>
      </div>

      {/* Card with Discount List */}
      <ComponentCard>
        <DiscountList key={refreshKey} onEditDiscount={handleEditDiscount} />
      </ComponentCard>

      {/* Create/Edit Discount Modal */}
      <CreateDiscountModal
        open={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={handleDiscountCreated}
        editingDiscount={editingDiscount}
        onDelete={handleDeleteDiscount}
      />
    </div>
  );
}