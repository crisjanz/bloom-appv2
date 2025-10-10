/**
 * Test Migration Page
 * Demo showing Customer domain integration vs old approach
 */

import React from 'react'
import PageMeta from '@shared/ui/common/PageMeta'
import ComponentCard from '@shared/ui/common/ComponentCard'

// NEW: Domain hooks from customer service
import { useCustomerSearch, useSelectedCustomer } from '@domains/customers/hooks/useCustomerService'

export default function TestMigration() {
  // NEW APPROACH (domain-driven)
  const { query, setQuery, results, isSearching } = useCustomerSearch()
  const { selectedCustomer, setSelectedCustomer, hasCustomer } = useSelectedCustomer()

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageMeta title="Migration Test" />
      
      <div className="space-y-6">
        {/* DOMAIN-DRIVEN APPROACH */}
        <ComponentCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-600">
              ✅ NEW APPROACH (Domain-Driven)
            </h3>
            <div className="space-y-2 text-sm">
              <div>Query: "{query}"</div>
              <div>Results: {results.length} customers</div>
              <div>Is Searching: {isSearching ? 'Yes' : 'No'}</div>
              <div>Selected: {hasCustomer ? 'Yes' : 'No'}</div>
              <div>Customer Name: {selectedCustomer?.firstName} {selectedCustomer?.lastName}</div>
              <div>Customer Type: {selectedCustomer?.customerType}</div>
              <div>Loyalty Points: {selectedCustomer?.loyaltyPoints || 0}</div>
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search customers (domain hook)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              {results.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                  {results.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setQuery('')
                      }}
                    >
                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      <div className="text-sm text-gray-600">
                        {customer.phone} • {customer.customerType}
                        {customer.loyaltyPoints && customer.loyaltyPoints > 0 && (
                          <span className="ml-2 text-green-600">⭐ {customer.loyaltyPoints} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isSearching && (
                <div className="mt-2 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#597485] mx-auto"></div>
                  <div className="mt-1 text-sm">Searching...</div>
                </div>
              )}
            </div>
          </div>
        </ComponentCard>

        {/* DOMAIN ARCHITECTURE BENEFITS */}
        <ComponentCard>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">
              📊 Domain-Driven Architecture Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-600 mb-2">Architecture Benefits:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• ✅ Clean domain architecture</li>
                  <li>• ✅ Service layer abstraction</li>
                  <li>• ✅ Full TypeScript coverage</li>
                  <li>• ✅ Automatic debouncing (300ms)</li>
                  <li>• ✅ Comprehensive error handling</li>
                  <li>• ✅ Rich customer data</li>
                  <li>• ✅ Unit testable services</li>
                  <li>• ✅ Loyalty points & preferences</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-600 mb-2">Technical Features:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• ✅ Repository pattern implementation</li>
                  <li>• ✅ Domain entities with proper typing</li>
                  <li>• ✅ Separation of concerns</li>
                  <li>• ✅ Future-ready for website integration</li>
                  <li>• ✅ Better UX with loading states</li>
                  <li>• ✅ Scalable service architecture</li>
                  <li>• ✅ Centralized business logic</li>
                  <li>• ✅ Easy to maintain and extend</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
                🎯 Customer Domain Features:
              </h5>
              <ol className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>1. ✅ Customer search with debouncing</li>
                <li>2. ✅ Customer selection management</li>
                <li>3. ✅ Walk-in customer creation</li>
                <li>4. ✅ Phone-based customer lookup</li>
                <li>5. ✅ Customer data updates</li>
                <li>6. ✅ Loyalty points tracking</li>
              </ol>
            </div>
          </div>
        </ComponentCard>
      </div>
    </div>
  )
}