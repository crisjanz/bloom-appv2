/**
 * Customer Search Demo Component
 * Demonstrates the new DDD Customer domain integration with existing UI components
 */

import React, { useState } from 'react'
import { useCustomerSearch, useSelectedCustomer } from '../hooks/useCustomerService'
import { Customer } from '../entities/Customer'

// Import existing UI components from current system
import ComponentCard from '@shared/ui/common/ComponentCard'
import InputField from '@shared/ui/forms/input/InputField'
import { UserIcon2 } from '@shared/assets/icons'

interface CustomerSearchDemoProps {
  onCustomerSelect?: (customer: Customer) => void
  showCreateOption?: boolean
}

export const CustomerSearchDemo: React.FC<CustomerSearchDemoProps> = ({
  onCustomerSelect,
  showCreateOption = true
}) => {
  const { query, setQuery, results, isSearching, clearSearch } = useCustomerSearch()
  const { selectedCustomer, setSelectedCustomer, clearCustomer } = useSelectedCustomer()
  const [showResults, setShowResults] = useState(false)

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowResults(false)
    clearSearch()
    onCustomerSelect?.(customer)
  }

  const handleInputFocus = () => {
    if (results.length > 0) {
      setShowResults(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding results to allow clicks
    setTimeout(() => setShowResults(false), 200)
  }

  return (
    <ComponentCard>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Customer Selection (New DDD Architecture)
          </h3>
          {selectedCustomer && (
            <button
              onClick={clearCustomer}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Selected Customer Display */}
        {selectedCustomer ? (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {selectedCustomer.avatar ? (
                  <img
                    src={selectedCustomer.avatar}
                    alt={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <UserIcon2 className="w-5 h-5 text-green-600 dark:text-green-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {selectedCustomer.phone && (
                    <div>📞 {selectedCustomer.phone}</div>
                  )}
                  {selectedCustomer.email && (
                    <div>✉️ {selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.loyaltyPoints && selectedCustomer.loyaltyPoints > 0 && (
                    <div className="text-green-600 dark:text-green-400">
                      ⭐ {selectedCustomer.loyaltyPoints} loyalty points
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                <div>Customer Type: {selectedCustomer.customerType}</div>
                {selectedCustomer.totalSpent && selectedCustomer.totalSpent > 0 && (
                  <div>Lifetime Value: ${selectedCustomer.totalSpent.toFixed(2)}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Customer Search */
          <div className="relative">
            <InputField
              label="Search Customer"
              placeholder="Search by name, phone, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />

            {/* Loading Indicator */}
            {isSearching && (
              <div className="absolute right-3 top-9 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#597485]"></div>
              </div>
            )}

            {/* Search Results Dropdown */}
            {showResults && results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {results.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {customer.avatar ? (
                          <img
                            src={customer.avatar}
                            alt={`${customer.firstName} ${customer.lastName}`}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <UserIcon2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-x-4">
                          {customer.phone && <span>📞 {customer.phone}</span>}
                          {customer.email && <span>✉️ {customer.email}</span>}
                        </div>
                      </div>
                      {customer.customerType === 'WALK_IN' && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Walk-in
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {showResults && results.length === 0 && query.length >= 3 && !isSearching && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>No customers found for "{query}"</p>
                  {showCreateOption && (
                    <button className="mt-2 text-[#597485] hover:text-[#4e6575] text-sm">
                      Create new customer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demo Information */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            🚀 New DDD Architecture Demo
          </h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <div>✅ <strong>Domain Service:</strong> CustomerService handles business logic</div>
            <div>✅ <strong>Repository Pattern:</strong> Clean data access layer</div>
            <div>✅ <strong>React Hooks:</strong> useCustomerSearch with debouncing</div>
            <div>✅ <strong>Type Safety:</strong> Full TypeScript interfaces</div>
            <div>✅ <strong>Future Ready:</strong> Same service works for POS + website</div>
          </div>
        </div>

        {/* Architecture Benefits */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Current POS Integration</h5>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              • Same customer search as existing POS<br/>
              • Compatible with current UI components<br/>
              • Drop-in replacement for legacy hooks
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Future Website Ready</h5>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              • Authentication methods built-in<br/>
              • Subscription system hooks ready<br/>
              • Loyalty points and preferences included
            </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  )
}