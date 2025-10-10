/**
 * Customer Repository
 * Data access layer for Customer domain
 */

import { BaseRepository } from '@shared/infrastructure/database/BaseRepository'
import { 
  Customer, 
  CustomerSearchCriteria, 
  CustomerStats, 
  CustomerActivity,
  SavedPaymentMethod,
  PaymentProvider
} from '../entities/Customer'
import { PaginatedResult } from '@shared/types/common'

export class CustomerRepository extends BaseRepository<Customer> {
  protected readonly endpoint = '/api/customers'
  protected readonly entityName = 'Customer'

  /**
   * Search customers by phone number (primary lookup for POS)
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    try {
      const customers = await this.customQuery<Customer[]>('search', { phone })
      return customers.length > 0 ? customers[0] : null
    } catch {
      return null
    }
  }

  /**
   * Search customers by email (primary lookup for website)
   */
  async findByEmail(email: string): Promise<Customer | null> {
    try {
      const customers = await this.customQuery<Customer[]>('search', { email })
      return customers.length > 0 ? customers[0] : null
    } catch {
      return null
    }
  }

  /**
   * Advanced customer search with multiple criteria
   */
  async searchCustomers(
    criteria: CustomerSearchCriteria, 
    page = 1, 
    limit = 20
  ): Promise<PaginatedResult<Customer>> {
    return this.findMany({
      page,
      limit,
      search: criteria.query,
      filters: {
        customerType: criteria.customerType,
        status: criteria.status,
        tags: criteria.tags?.join(','),
        city: criteria.city,
        province: criteria.province,
        hasSubscriptions: criteria.hasSubscriptions,
        vipOnly: criteria.vipOnly,
        createdAfter: criteria.createdAfter?.toISOString(),
        createdBefore: criteria.createdBefore?.toISOString(),
        totalSpentMin: criteria.totalSpentMin,
        totalSpentMax: criteria.totalSpentMax
      }
    })
  }

  /**
   * Quick search for POS/admin interfaces (name, phone, email)
   */
  async quickSearch(query: string, limit = 10): Promise<Customer[]> {
    if (query.length < 3) return []
    
    return this.customQuery<Customer[]>('quick-search', { 
      query: query.trim(), 
      limit 
    })
  }

  /**
   * Get customer statistics for dashboard
   */
  async getCustomerStats(): Promise<CustomerStats> {
    return this.customQuery<CustomerStats>('stats')
  }

  /**
   * Get customer activity history
   */
  async getCustomerActivity(
    customerId: string, 
    page = 1, 
    limit = 50
  ): Promise<PaginatedResult<CustomerActivity>> {
    return this.customQuery<PaginatedResult<CustomerActivity>>(
      `${customerId}/activity`, 
      { page, limit }
    )
  }

  /**
   * Add activity to customer history
   */
  async addActivity(activity: Omit<CustomerActivity, 'timestamp'>): Promise<CustomerActivity> {
    return this.customMutation<CustomerActivity>(
      `${activity.customerId}/activity`, 
      activity
    )
  }

  /**
   * Get customers with upcoming birthdays (for marketing)
   */
  async getUpcomingBirthdays(days = 30): Promise<Customer[]> {
    return this.customQuery<Customer[]>('upcoming-birthdays', { days })
  }

  /**
   * Get customers who haven't ordered recently (for retention campaigns)
   */
  async getInactiveCustomers(daysSinceLastOrder = 90): Promise<Customer[]> {
    return this.customQuery<Customer[]>('inactive', { daysSinceLastOrder })
  }

  /**
   * Get VIP customers (high lifetime value)
   */
  async getVipCustomers(): Promise<Customer[]> {
    return this.customQuery<Customer[]>('vip')
  }

  /**
   * Update customer loyalty points
   */
  async updateLoyaltyPoints(
    customerId: string, 
    pointsChange: number, 
    reason: string
  ): Promise<Customer> {
    return this.customMutation<Customer>(
      `${customerId}/loyalty-points`, 
      { pointsChange, reason },
      'PUT'
    )
  }

  /**
   * Update customer account balance (for house accounts)
   */
  async updateAccountBalance(
    customerId: string, 
    balanceChange: number, 
    reason: string
  ): Promise<Customer> {
    return this.customMutation<Customer>(
      `${customerId}/account-balance`, 
      { balanceChange, reason },
      'PUT'
    )
  }

  // ========== Payment Methods Management ==========

  /**
   * Get customer's saved payment methods
   */
  async getPaymentMethods(customerId: string): Promise<SavedPaymentMethod[]> {
    return this.customQuery<SavedPaymentMethod[]>(`${customerId}/payment-methods`)
  }

  /**
   * Add saved payment method for customer
   */
  async addPaymentMethod(paymentMethod: Omit<SavedPaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPaymentMethod> {
    return this.customMutation<SavedPaymentMethod>(
      `${paymentMethod.customerId}/payment-methods`,
      paymentMethod
    )
  }

  /**
   * Remove saved payment method
   */
  async removePaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.customMutation<void>(
      `${customerId}/payment-methods/${paymentMethodId}`,
      {},
      'DELETE' as any
    )
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.customMutation<void>(
      `${customerId}/payment-methods/${paymentMethodId}/set-default`,
      {},
      'PUT'
    )
  }

  /**
   * Get payment methods by provider (for cross-provider compatibility)
   */
  async getPaymentMethodsByProvider(
    customerId: string, 
    provider: PaymentProvider
  ): Promise<SavedPaymentMethod[]> {
    return this.customQuery<SavedPaymentMethod[]>(
      `${customerId}/payment-methods`, 
      { provider }
    )
  }

  // ========== Bulk Operations ==========

  /**
   * Bulk update customer tags
   */
  async bulkUpdateTags(customerIds: string[], tags: string[]): Promise<void> {
    await this.customMutation<void>('bulk/update-tags', {
      customerIds,
      tags
    })
  }

  /**
   * Bulk update customer status
   */
  async bulkUpdateStatus(customerIds: string[], status: string): Promise<void> {
    await this.customMutation<void>('bulk/update-status', {
      customerIds,
      status
    })
  }

  /**
   * Export customers to CSV
   */
  async exportCustomers(criteria?: CustomerSearchCriteria): Promise<string> {
    return this.customQuery<string>('export', criteria)
  }

  // ========== Analytics Queries ==========

  /**
   * Get customer lifetime value distribution
   */
  async getLifetimeValueDistribution(): Promise<Record<string, number>> {
    return this.customQuery<Record<string, number>>('analytics/lifetime-value')
  }

  /**
   * Get customer acquisition trends
   */
  async getAcquisitionTrends(months = 12): Promise<Record<string, number>> {
    return this.customQuery<Record<string, number>>('analytics/acquisition', { months })
  }

  /**
   * Get customer retention metrics
   */
  async getRetentionMetrics(): Promise<{
    monthlyRetentionRate: number
    averageCustomerLifespan: number
    churnRate: number
  }> {
    return this.customQuery('analytics/retention')
  }
}