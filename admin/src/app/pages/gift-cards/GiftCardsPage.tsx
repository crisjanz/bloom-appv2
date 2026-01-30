import { useCallback, useEffect, useState } from "react";
import { useBusinessTimezone } from "@shared/hooks/useBusinessTimezone";
import { useApiClient } from "@shared/hooks/useApiClient";
import StandardTable, { ColumnDef } from "@shared/ui/components/ui/table/StandardTable";
import ComponentCard from "@shared/ui/common/ComponentCard";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import { getGiftCardStatusColor } from "@shared/utils/statusColors";
import { formatCurrency } from "@shared/utils/currency";
import FormError from "@shared/ui/components/ui/form/FormError";
import CreateBatchModal from "@app/components/gift-cards/CreateBatchModal";
import GiftCardDetailModal from "@app/components/gift-cards/GiftCardDetailModal";

// Inline SVG icons
const EyeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

type GiftCard = {
  id: string;
  cardNumber: string;
  type: 'PHYSICAL' | 'DIGITAL';
  initialValue: number;
  currentBalance: number;
  status: 'INACTIVE' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  purchasedBy?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  createdAt: string;
  expirationDate?: string;
};

export default function GiftCardsPage() {
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const apiClient = useApiClient();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<GiftCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const loadGiftCards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, status } = await apiClient.get("/api/gift-cards");
      if (status >= 400) {
        throw new Error(data?.error || "Failed to load gift cards");
      }
      setGiftCards(data.cards || []);
      setFilteredCards(data.cards || []);
    } catch (err) {
      setError("Failed to load gift cards");
      console.error("Error loading gift cards:", err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadGiftCards();
  }, [loadGiftCards]);

  useEffect(() => {
    let filtered = giftCards.filter((card) => {
      const matchesSearch = 
        card.cardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.recipientName && card.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (card.recipientEmail && card.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "ALL" || card.status === statusFilter;
      const matchesType = typeFilter === "ALL" || card.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
    
    setFilteredCards(filtered);
  }, [searchTerm, statusFilter, typeFilter, giftCards]);

  const formatDate = (dateString: string) => {
    if (timezoneLoading) return dateString;
    return formatBusinessDate(new Date(dateString));
  };

  const handleViewDetails = (card: GiftCard) => {
    setSelectedCardId(card.id);
    setShowDetailModal(true);
  };

  // Define table columns
  const columns: ColumnDef<GiftCard>[] = [
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      render: (card) => {
        const statusColor = getGiftCardStatusColor(card.status);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{card.status}</span>
          </div>
        );
      },
    },
    {
      key: 'cardNumber',
      header: 'Card Number',
      className: 'w-[150px]',
      render: (card) => (
        <div>
          <div className="font-mono text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
            {card.cardNumber}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatDate(card.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      className: 'w-[100px]',
      render: (card) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {card.type}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      className: 'w-[100px]',
      render: (card) => (
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
            {formatCurrency(card.initialValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatCurrency(card.currentBalance)} left
          </div>
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      className: 'w-[180px] max-w-[180px]',
      render: (card) => {
        const recipientName = card.recipientName || '—';
        const recipientEmail = card.recipientEmail || '';
        return (
          <div className="max-w-[180px] truncate">
            <div className="text-sm text-gray-800 dark:text-white/90 truncate" title={recipientName}>
              {recipientName}
            </div>
            {recipientEmail && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={recipientEmail}>
                {recipientEmail}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[80px]',
      render: (card) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(card);
            }}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View details"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "USED", label: "Used" },
    { value: "EXPIRED", label: "Expired" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const typeOptions = [
    { value: "ALL", label: "All Types" },
    { value: "PHYSICAL", label: "Physical" },
    { value: "DIGITAL", label: "Digital" },
  ];

  return (
    <div className="p-6">
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gift Cards</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage gift cards, view transactions, and track balances
          </p>
        </div>
        <button
          onClick={() => setShowCreateBatchModal(true)}
          className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Create Batch
        </button>
      </div>

      {batchNotice && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {batchNotice}
        </div>
      )}

      {/* Card with Filters + Table */}
      <ComponentCard>
        {error && <FormError error={error} />}
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Search"
              placeholder="Search by card number, recipient name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            />

            <Select
              label="Type"
              options={typeOptions}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
            />
          </div>

          <div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
              }}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Table */}
        <StandardTable
          columns={columns}
          data={filteredCards}
          loading={loading && giftCards.length === 0}
          emptyState={{
            message: "No gift cards found",
          }}
        />
      </ComponentCard>

      <CreateBatchModal
        open={showCreateBatchModal}
        onClose={() => setShowCreateBatchModal(false)}
        onSuccess={(count) => {
          setBatchNotice(`Created ${count} gift card${count === 1 ? "" : "s"}.`);
          loadGiftCards();
        }}
      />

      <GiftCardDetailModal
        open={showDetailModal}
        cardId={selectedCardId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCardId(null);
        }}
        onCardUpdated={loadGiftCards}
      />
    </div>
  );
}
