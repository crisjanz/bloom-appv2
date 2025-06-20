import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { fetchCoupons, deleteCoupon } from "../../services/couponService";
import { Coupon, DiscountType } from "../../types/coupon";
import CouponFormModal from "./CouponFormModal";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await fetchCoupons();
      setCoupons(data);
      setFilteredCoupons(data);
    } catch (err) {
      setError("Failed to load coupons");
      console.error("Error loading coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = coupons.filter((coupon) => {
      const matchesSearch = 
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (coupon.description && coupon.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "ALL" || 
        (statusFilter === "ENABLED" && coupon.enabled) ||
        (statusFilter === "DISABLED" && !coupon.enabled);
      
      const matchesType = typeFilter === "ALL" || coupon.discountType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
    
    setFilteredCoupons(filtered);
  }, [searchTerm, statusFilter, typeFilter, coupons]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDiscountDisplay = (coupon: Coupon) => {
    switch (coupon.discountType) {
      case 'PERCENTAGE':
        return `${coupon.value}%`;
      case 'FIXED_AMOUNT':
        return formatCurrency(coupon.value);
      case 'FREE_SHIPPING':
        return 'Free Shipping';
      default:
        return `${coupon.value}`;
    }
  };

  const getStatusBadgeColor = (enabled: boolean) => {
    return enabled ? 'success' : 'error';
  };

  const getTypeBadgeColor = (type: DiscountType) => {
    switch (type) {
      case 'PERCENTAGE':
        return 'info';
      case 'FIXED_AMOUNT':
        return 'warning';
      case 'FREE_SHIPPING':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setShowFormModal(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setShowFormModal(true);
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      try {
        await deleteCoupon(coupon.id);
        loadCoupons(); // Reload the list
      } catch (error) {
        alert('Failed to delete coupon');
        console.error('Error deleting coupon:', error);
      }
    }
  };

  const handleFormModalClose = (shouldReload = false) => {
    setShowFormModal(false);
    setEditingCoupon(null);
    if (shouldReload) {
      loadCoupons();
    }
  };

  const getUsageInfo = (coupon: Coupon) => {
    if (!coupon.usageLimit) {
      return `${coupon.usageCount} uses`;
    }
    return `${coupon.usageCount}/${coupon.usageLimit} uses`;
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.endDate) return false;
    return new Date() > new Date(coupon.endDate);
  };

  const isUpcoming = (coupon: Coupon) => {
    if (!coupon.startDate) return false;
    return new Date() < new Date(coupon.startDate);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <p className="text-center text-gray-500">Loading coupons...</p>
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
              <Button onClick={loadCoupons} className="bg-[#597485] hover:bg-[#4e6575]">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Coupons & Discounts
            </h3>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400 mt-1">
              Manage discount coupons and promotional codes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadCoupons}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              🔄 Refresh
            </button>
            <Button 
              onClick={handleCreateCoupon}
              className="bg-[#597485] hover:bg-[#4e6575] text-white"
            >
              + New Coupon
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{coupons.length}</p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">Total Coupons</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {coupons.filter(coupon => coupon.enabled && !isExpired(coupon) && !isUpcoming(coupon)).length}
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {coupons.filter(coupon => isExpired(coupon)).length}
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">Expired</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {coupons.reduce((sum, coupon) => sum + coupon.usageCount, 0)}
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">Total Uses</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by code, name, or description..."
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
              <option value="ENABLED">Enabled</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-theme-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="ALL">All Types</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed Amount</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="max-w-full overflow-x-auto">
          {filteredCoupons.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-theme-sm">
                {coupons.length === 0 ? "No coupons found" : "No coupons match your search criteria"}
              </p>
              {coupons.length === 0 && (
                <Button 
                  onClick={handleCreateCoupon}
                  className="mt-4 bg-[#597485] hover:bg-[#4e6575] text-white"
                >
                  Create Your First Coupon
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                <TableRow>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Coupon Code & Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Discount & Type
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Usage & Limits
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Validity Period
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Status & Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="py-4">
                      <div>
                        <p className="font-mono font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {coupon.code}
                        </p>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {coupon.name}
                        </p>
                        {coupon.description && (
                          <p className="text-theme-xs text-gray-500 mt-1 dark:text-gray-400">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {formatDiscountDisplay(coupon)}
                        </p>
                        <Badge size="sm" color={getTypeBadgeColor(coupon.discountType)}>
                          {coupon.discountType.replace('_', ' ')}
                        </Badge>
                        {coupon.minimumOrder && (
                          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                            Min: {formatCurrency(coupon.minimumOrder)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {getUsageInfo(coupon)}
                        </p>
                        {coupon.perCustomerLimit && (
                          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                            Max {coupon.perCustomerLimit} per customer
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-theme-sm">
                        {coupon.startDate && (
                          <p className="text-gray-600 dark:text-gray-300">
                            From: {formatDate(coupon.startDate)}
                          </p>
                        )}
                        {coupon.endDate && (
                          <p className={`${isExpired(coupon) ? 'text-red-600' : 'text-gray-600'} dark:text-gray-300`}>
                            Until: {formatDate(coupon.endDate)}
                          </p>
                        )}
                        {!coupon.startDate && !coupon.endDate && (
                          <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                            No expiration
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge size="sm" color={getStatusBadgeColor(coupon.enabled)}>
                            {coupon.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {isExpired(coupon) && (
                            <Badge size="sm" color="error">Expired</Badge>
                          )}
                          {isUpcoming(coupon) && (
                            <Badge size="sm" color="warning">Upcoming</Badge>
                          )}
                          {coupon.posOnly && (
                            <Badge size="sm" color="info">POS Only</Badge>
                          )}
                          {coupon.webOnly && (
                            <Badge size="sm" color="info">Web Only</Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => handleEditCoupon(coupon)}
                            className="text-start text-blue-600 hover:text-blue-800 text-theme-xs"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCoupon(coupon)}
                            className="text-start text-red-600 hover:text-red-800 text-theme-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <CouponFormModal
          coupon={editingCoupon}
          onClose={handleFormModalClose}
        />
      )}
    </>
  );
}