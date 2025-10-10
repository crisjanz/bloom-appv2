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
    <div className="bg-whiten dark:bg-boxdark min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageMeta title="Discounts" />
        <PageBreadcrumb pageName="Discounts" />

        <ComponentCard 
          title="Discount Manager" 
          subtitle="Manage all your discounts and coupons in one place"
        >
          {/* Header with Add Button */}
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#597485] hover:bg-[#4e6575] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Discount
            </button>
          </div>

          {/* Discount List */}
          <DiscountList key={refreshKey} onEditDiscount={handleEditDiscount} />

          {/* Create/Edit Discount Modal */}
          <CreateDiscountModal
            open={showCreateModal}
            onClose={handleCloseModal}
            onSuccess={handleDiscountCreated}
            editingDiscount={editingDiscount}
            onDelete={handleDeleteDiscount}
          />
        </ComponentCard>
      </div>
    </div>
  );
}