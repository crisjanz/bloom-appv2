import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import React from "react";
import { Link } from "react-router-dom";

const DiscountsPage = () => (
  <div className="space-y-6">
    <PageBreadcrumb pageName="Discounts Settings" />
    <h2 className="text-2xl font-semibold text-black dark:text-white">Discounts Settings</h2>
    
    <ComponentCard title="Unified Discount System" subtitle="Manage all discount types in one place">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-[#597485] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
          Manage All Discounts
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Create and manage percentage discounts, fixed amounts, free delivery, sale prices, and buy-X-get-Y promotions with automatic or coupon code triggers.
        </p>
        <Link
          to="/discounts"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#597485] hover:bg-[#4e6575] text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Open Discounts Manager
        </Link>
      </div>
    </ComponentCard>

    <ComponentCard title="Legacy Coupon System" subtitle="Deprecated - migrate to unified discounts">
      <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          The old coupon system has been replaced by the unified discount system.
          <br />
          Please use the new Discounts Manager above for all discount management.
        </p>
      </div>
    </ComponentCard>
  </div>
);

export default DiscountsPage;
