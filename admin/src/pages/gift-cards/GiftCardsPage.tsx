import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import InputField from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { fetchGiftCards } from "../../services/giftCardService";
import { useBusinessTimezone } from "../../hooks/useBusinessTimezone";

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
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<GiftCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGiftCards();
  }, []);

  const loadGiftCards = async () => {
    try {
      setLoading(true);
      const data = await fetchGiftCards();
      setGiftCards(data.cards || []);
      setFilteredCards(data.cards || []);
    } catch (err) {
      setError("Failed to load gift cards");
      console.error("Error loading gift cards:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (timezoneLoading) return dateString;
    return formatBusinessDate(new Date(dateString));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'warning';
      case 'USED':
        return 'success';
      case 'EXPIRED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    return type === 'DIGITAL' ? 'info' : 'secondary';
  };

  const handleViewDetails = (card: GiftCard) => {
    alert(`Gift Card Details:\n\nCard: ${card.cardNumber}\nStatus: ${card.status}\nBalance: ${formatCurrency(card.currentBalance)}\nType: ${card.type}\n\n(Full details modal coming soon)`);
  };

  const handleTransactionHistory = (card: GiftCard) => {
    alert(`Transaction History for ${card.cardNumber}:\n\n(Transaction history feature coming soon)`);
  };

  const handleDeactivateCard = async (card: GiftCard) => {
    if (confirm(`Are you sure you want to deactivate gift card ${card.cardNumber}?`)) {
      try {
        // TODO: Implement deactivation API call
        alert(`Gift card ${card.cardNumber} would be deactivated (API integration needed)`);
        // After successful deactivation, reload the list
        // loadGiftCards();
      } catch (error) {
        alert('Failed to deactivate gift card');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <p className="text-center text-gray-500">Loading gift cards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <p className="text-center text-red-500">{error}</p>
            <div className="text-center mt-4">
              <Button onClick={loadGiftCards} className="bg-[#597485] hover:bg-[#4e6575]">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Gift Cards
          </h3>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage gift cards, view transactions, and track balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadGiftCards}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            🔄 Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            + Create Batch
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{giftCards.length}</p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">Total Cards</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {giftCards.filter(card => card.status === 'ACTIVE').length}
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {formatCurrency(giftCards.reduce((sum, card) => sum + card.initialValue, 0))}
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">Total Value</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {formatCurrency(giftCards.reduce((sum, card) => sum + card.currentBalance, 0))}
          </p>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">Outstanding</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Search by card number, recipient name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-theme-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-theme-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="USED">Used</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-theme-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="ALL">All Types</option>
            <option value="PHYSICAL">Physical</option>
            <option value="DIGITAL">Digital</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        {filteredCards.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-theme-sm">
              {giftCards.length === 0 ? "No gift cards found" : "No cards match your search criteria"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Card Details
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Type & Status
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Value & Balance
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Recipient
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="py-4">
                    <div>
                      <p className="font-mono font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {card.cardNumber}
                      </p>
                      <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                        Created {formatDate(card.createdAt)}
                      </span>
                      {card.message && (
                        <p className="text-theme-xs text-gray-500 italic mt-1 dark:text-gray-400">
                          "{card.message}"
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <Badge size="sm" color={getTypeBadgeColor(card.type)}>
                        {card.type}
                      </Badge>
                      <Badge size="sm" color={getStatusBadgeColor(card.status)}>
                        {card.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {formatCurrency(card.initialValue)}
                      </p>
                      <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                        Balance: {formatCurrency(card.currentBalance)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                    <div>
                      {card.recipientName && (
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {card.recipientName}
                        </p>
                      )}
                      {card.recipientEmail && (
                        <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                          {card.recipientEmail}
                        </span>
                      )}
                      {!card.recipientName && !card.recipientEmail && (
                        <span className="text-gray-400 text-theme-xs">No recipient</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleViewDetails(card)}
                        className="text-start text-blue-600 hover:text-blue-800 text-theme-xs"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => handleTransactionHistory(card)}
                        className="text-start text-green-600 hover:text-green-800 text-theme-xs"
                      >
                        Transaction History
                      </button>
                      {card.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handleDeactivateCard(card)}
                          className="text-start text-red-600 hover:text-red-800 text-theme-xs"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}