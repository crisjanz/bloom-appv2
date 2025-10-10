/**
 * Payment Repository
 * Data access layer for payment transactions and PT-XXXX management
 */

import { BaseRepository } from '@shared/infrastructure/database/BaseRepository'
import { PaymentTransaction, PaymentAnalytics, PaymentProvider, PaymentStatus, PaymentMethodType, PaymentErrorType } from '../entities/Payment'
import { Money } from '@shared/types/common'

export class PaymentRepository extends BaseRepository<PaymentTransaction> {
  protected readonly endpoint = 'payments'
  protected readonly entityName = 'PaymentTransaction'
  protected tableName = 'payment_transactions'

  // ===== SPECIALIZED QUERIES =====

  /**
   * Find transaction by PT-XXXX number
   */
  async findByTransactionNumber(transactionNumber: string): Promise<PaymentTransaction | null> {
    const result = await this.findMany({
      filters: { transactionNumber },
      limit: 1
    })
    return result.items[0] || null
  }

  /**
   * Find transactions by customer ID
   */
  async findByCustomerId(customerId: string): Promise<PaymentTransaction[]> {
    const result = await this.findMany({
      filters: { customerId }
    })
    return result.items
  }

  /**
   * Find transactions by order ID
   */
  async findByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    const result = await this.findMany({
      filters: { orderId }
    })
    return result.items
  }

  /**
   * Find transactions by employee ID
   */
  async findByEmployeeId(employeeId: string): Promise<PaymentTransaction[]> {
    const result = await this.findMany({
      filters: { employeeId }
    })
    return result.items
  }

  /**
   * Find transactions by status
   */
  async findByStatus(status: PaymentStatus): Promise<PaymentTransaction[]> {
    const result = await this.findMany({
      filters: { paymentStatus: status }
    })
    return result.items
  }

  /**
   * Find transactions by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<PaymentTransaction[]> {
    const result = await this.findMany({
      filters: {
        processedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })
    return result.items
  }

  /**
   * Find transactions with gift cards
   */
  async findWithGiftCards(): Promise<PaymentTransaction[]> {
    // In real implementation, this would use JSON array queries
    const allTransactions = await this.findAll()
    return allTransactions.filter(t => t.giftCards.length > 0)
  }

  /**
   * Find failed transactions that can be retried
   */
  async findRetryableFailures(maxRetries: number = 3): Promise<PaymentTransaction[]> {
    const failedTransactions = await this.findByStatus(PaymentStatus.FAILED)
    return failedTransactions.filter(t => t.retryCount < maxRetries)
  }

  /**
   * Get last transaction for PT number generation
   */
  async getLastTransaction(): Promise<PaymentTransaction | null> {
    const result = await this.findMany({
      filters: {},
      limit: 1
    })
    return result.items[0] || null
  }

  // ===== TRANSACTION NUMBER MANAGEMENT =====

  /**
   * Get next PT transaction number
   */
  async getNextTransactionNumber(): Promise<string> {
    const lastTransaction = await this.getLastTransaction()
    
    if (!lastTransaction) {
      return 'PT-10001'
    }

    // Extract number from PT-XXXX format
    const lastNumber = parseInt(lastTransaction.transactionNumber.replace('PT-', ''))
    const nextNumber = lastNumber + 1
    
    return `PT-${nextNumber.toString().padStart(5, '0')}`
  }

  /**
   * Validate transaction number uniqueness
   */
  async isTransactionNumberUnique(transactionNumber: string): Promise<boolean> {
    const existing = await this.findByTransactionNumber(transactionNumber)
    return existing === null
  }

  // ===== ADVANCED SEARCH =====

  /**
   * Search transactions with complex criteria
   */
  async search(criteria: {
    transactionNumber?: string
    customerId?: string
    employeeId?: string
    status?: PaymentStatus
    provider?: PaymentProvider
    dateFrom?: Date
    dateTo?: Date
    amountMin?: number
    amountMax?: number
    hasGiftCards?: boolean
    limit?: number
    offset?: number
  }): Promise<PaymentTransaction[]> {
    const queryBuilder = this.createQueryBuilder()

    // Apply filters
    if (criteria.transactionNumber) {
      queryBuilder.where('transactionNumber', criteria.transactionNumber)
    }
    
    if (criteria.customerId) {
      queryBuilder.where('customerId', criteria.customerId)
    }
    
    if (criteria.employeeId) {
      queryBuilder.where('employeeId', criteria.employeeId)
    }
    
    if (criteria.status) {
      queryBuilder.where('paymentStatus', criteria.status)
    }
    
    if (criteria.dateFrom) {
      queryBuilder.where('processedAt', '>=', criteria.dateFrom)
    }
    
    if (criteria.dateTo) {
      queryBuilder.where('processedAt', '<=', criteria.dateTo)
    }
    
    if (criteria.amountMin) {
      queryBuilder.where(`totalAmount->>'$.amount'`, '>=', criteria.amountMin)
    }
    
    if (criteria.amountMax) {
      queryBuilder.where(`totalAmount->>'$.amount'`, '<=', criteria.amountMax)
    }
    
    if (criteria.hasGiftCards !== undefined) {
      if (criteria.hasGiftCards) {
        queryBuilder.whereRaw('JSON_LENGTH(giftCards) > 0')
      } else {
        queryBuilder.whereRaw('JSON_LENGTH(giftCards) = 0')
      }
    }

    // Apply pagination
    if (criteria.limit) {
      queryBuilder.limit(criteria.limit)
    }
    
    if (criteria.offset) {
      queryBuilder.offset(criteria.offset)
    }

    // Default ordering
    queryBuilder.orderBy('processedAt', 'DESC')

    return await queryBuilder.execute()
  }

  // ===== ANALYTICS =====

  /**
   * Generate payment analytics for business insights
   */
  async getPaymentAnalytics(dateFrom: Date, dateTo: Date): Promise<PaymentAnalytics> {
    const transactions = await this.findByDateRange(dateFrom, dateTo)
    const completedTransactions = transactions.filter(t => t.paymentStatus === PaymentStatus.COMPLETED)

    // Calculate basic metrics
    const totalTransactions = completedTransactions.length
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.totalAmount.amount, 0)
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Payment method breakdown
    const paymentMethodStats = this.calculatePaymentMethodStats(completedTransactions)

    // Success rates
    const totalAttempted = transactions.length
    const successRate = totalAttempted > 0 ? (totalTransactions / totalAttempted) * 100 : 0
    const failureRate = 100 - successRate

    // Error analysis
    const failedTransactions = transactions.filter(t => t.paymentStatus === PaymentStatus.FAILED)
    const errorsByType = this.analyzeErrors(failedTransactions)

    // Processing times
    const processingTimes = completedTransactions
      .filter(t => t.completedAt)
      .map(t => t.completedAt!.getTime() - t.processedAt.getTime())
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0

    // Gift card metrics
    const giftCardTransactions = completedTransactions.filter(t => t.giftCards.length > 0)
    const giftCardsActivated = giftCardTransactions.reduce((sum, t) => sum + t.giftCards.length, 0)
    const giftCardRevenue = giftCardTransactions.reduce((sum, t) => 
      sum + t.giftCards.reduce((cardSum, gc) => cardSum + gc.amount.amount, 0), 0
    )

    return {
      totalTransactions,
      totalRevenue: { amount: totalRevenue, currency: 'CAD' },
      averageTransactionValue: { amount: averageTransactionValue, currency: 'CAD' },
      paymentMethodStats,
      successRate,
      failureRate,
      errorsByType,
      averageProcessingTime,
      processingTimeByProvider: {
        [PaymentProvider.STRIPE]: 0,
        [PaymentProvider.SQUARE]: 0,
        [PaymentProvider.PAYPAL]: 0,
        [PaymentProvider.CASH]: 0,
        [PaymentProvider.GIFT_CARD]: 0
      } as Record<PaymentProvider, number>, // Would calculate per provider
      giftCardsActivated,
      giftCardRevenue: { amount: giftCardRevenue, currency: 'CAD' },
      periodStart: dateFrom,
      periodEnd: dateTo
    }
  }

  /**
   * Get daily payment summary
   */
  async getDailySummary(date: Date): Promise<{
    transactionCount: number
    totalRevenue: Money
    averageTransactionValue: Money
    paymentMethodBreakdown: Record<string, { count: number; amount: Money }>
    topCustomers: Array<{ customerId: string; transactionCount: number; totalSpent: Money }>
  }> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const transactions = await this.findByDateRange(startOfDay, endOfDay)
    const completedTransactions = transactions.filter(t => t.paymentStatus === PaymentStatus.COMPLETED)

    const transactionCount = completedTransactions.length
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.totalAmount.amount, 0)
    const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { count: number; amount: Money }> = {}
    completedTransactions.forEach(transaction => {
      transaction.paymentMethods.forEach(method => {
        const key = `${method.provider}_${method.type}`
        if (!paymentMethodBreakdown[key]) {
          paymentMethodBreakdown[key] = { count: 0, amount: { amount: 0, currency: 'CAD' } }
        }
        paymentMethodBreakdown[key].count++
        paymentMethodBreakdown[key].amount.amount += method.amount.amount
      })
    })

    // Top customers
    const customerSpending: Record<string, { count: number; total: number }> = {}
    completedTransactions.forEach(transaction => {
      const customerId = transaction.customerId
      if (!customerSpending[customerId]) {
        customerSpending[customerId] = { count: 0, total: 0 }
      }
      customerSpending[customerId].count++
      customerSpending[customerId].total += transaction.totalAmount.amount
    })

    const topCustomers = Object.entries(customerSpending)
      .map(([customerId, data]) => ({
        customerId,
        transactionCount: data.count,
        totalSpent: { amount: data.total, currency: 'CAD' as const }
      }))
      .sort((a, b) => b.totalSpent.amount - a.totalSpent.amount)
      .slice(0, 10)

    return {
      transactionCount,
      totalRevenue: { amount: totalRevenue, currency: 'CAD' },
      averageTransactionValue: { amount: averageTransactionValue, currency: 'CAD' },
      paymentMethodBreakdown,
      topCustomers
    }
  }

  // ===== REFUND MANAGEMENT =====

  /**
   * Create refund transaction
   */
  async createRefund(originalTransactionId: string, refundAmount: Money, reason: string): Promise<PaymentTransaction> {
    const originalTransaction = await this.findById(originalTransactionId)
    if (!originalTransaction) {
      throw new Error('Original transaction not found')
    }

    // Create refund transaction
    const refundTransaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      transactionNumber: await this.getNextTransactionNumber(),
      customerId: originalTransaction.customerId,
      employeeId: originalTransaction.employeeId,
      totalAmount: { amount: -refundAmount.amount, currency: refundAmount.currency },
      paymentMethods: [], // Will be populated with refund methods
      paymentStatus: PaymentStatus.PROCESSING,
      customerSnapshot: originalTransaction.customerSnapshot,
      giftCards: [],
      providerTransactions: [],
      cartSnapshot: originalTransaction.cartSnapshot,
      discountsApplied: [],
      processedAt: new Date(),
      notes: `Refund for transaction ${originalTransaction.transactionNumber}. Reason: ${reason}`,
      errorMessages: [],
      retryCount: 0
    }

    return await this.create(refundTransaction)
  }

  // ===== CLEANUP OPERATIONS =====

  /**
   * Clean up old failed transactions
   */
  async cleanupFailedTransactions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const oldFailedTransactions = await this.search({
      status: PaymentStatus.FAILED,
      dateTo: cutoffDate
    })

    let deletedCount = 0
    for (const transaction of oldFailedTransactions) {
      await this.delete(transaction.id)
      deletedCount++
    }

    return deletedCount
  }

  /**
   * Archive completed transactions
   */
  async archiveCompletedTransactions(olderThanMonths: number = 12): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths)

    const oldCompletedTransactions = await this.search({
      status: PaymentStatus.COMPLETED,
      dateTo: cutoffDate
    })

    // In real implementation, would move to archive table
    console.log(`Would archive ${oldCompletedTransactions.length} transactions`)
    return oldCompletedTransactions.length
  }

  // ===== HELPER METHODS =====

  private calculatePaymentMethodStats(transactions: PaymentTransaction[]): Array<{
    type: PaymentMethodType
    provider: PaymentProvider
    count: number
    totalAmount: Money
    percentage: number
  }> {
    const stats: Record<string, { count: number; amount: number }> = {}
    let grandTotal = 0

    transactions.forEach(transaction => {
      transaction.paymentMethods.forEach(method => {
        const key = `${method.type}_${method.provider}`
        if (!stats[key]) {
          stats[key] = { count: 0, amount: 0 }
        }
        stats[key].count++
        stats[key].amount += method.amount.amount
        grandTotal += method.amount.amount
      })
    })

    return Object.entries(stats).map(([key, data]) => {
      const [type, provider] = key.split('_')
      return {
        type: type as PaymentMethodType,
        provider: provider as PaymentProvider,
        count: data.count,
        totalAmount: { amount: data.amount, currency: 'CAD' as const },
        percentage: grandTotal > 0 ? (data.amount / grandTotal) * 100 : 0
      }
    })
  }

  private analyzeErrors(failedTransactions: PaymentTransaction[]): Record<PaymentErrorType, number> {
    const errorCounts = {
      [PaymentErrorType.VALIDATION_ERROR]: 0,
      [PaymentErrorType.PROVIDER_ERROR]: 0,
      [PaymentErrorType.NETWORK_ERROR]: 0,
      [PaymentErrorType.INSUFFICIENT_FUNDS]: 0,
      [PaymentErrorType.CARD_DECLINED]: 0,
      [PaymentErrorType.GIFT_CARD_ERROR]: 0,
      [PaymentErrorType.CUSTOMER_ERROR]: 0,
      [PaymentErrorType.SYSTEM_ERROR]: 0
    } as Record<PaymentErrorType, number>

    failedTransactions.forEach(transaction => {
      transaction.errorMessages.forEach(error => {
        // Extract error type from message (simplified)
        let errorType: PaymentErrorType = PaymentErrorType.SYSTEM_ERROR
        
        if (error.includes('card') || error.includes('Card')) {
          errorType = PaymentErrorType.CARD_DECLINED
        } else if (error.includes('network') || error.includes('Network')) {
          errorType = PaymentErrorType.NETWORK_ERROR
        } else if (error.includes('declined') || error.includes('Declined')) {
          errorType = PaymentErrorType.CARD_DECLINED
        } else if (error.includes('insufficient') || error.includes('Insufficient')) {
          errorType = PaymentErrorType.INSUFFICIENT_FUNDS
        } else if (error.includes('gift') || error.includes('Gift')) {
          errorType = PaymentErrorType.GIFT_CARD_ERROR
        } else if (error.includes('validation') || error.includes('Validation')) {
          errorType = PaymentErrorType.VALIDATION_ERROR
        } else if (error.includes('customer') || error.includes('Customer')) {
          errorType = PaymentErrorType.CUSTOMER_ERROR
        } else if (error.includes('provider') || error.includes('Provider')) {
          errorType = PaymentErrorType.PROVIDER_ERROR
        }
        
        errorCounts[errorType]++
      })
    })

    return errorCounts
  }

  private createQueryBuilder() {
    // Mock query builder - in real implementation, use actual ORM
    return {
      conditions: [] as any[],
      ordering: null as any,
      limitValue: null as number | null,
      offsetValue: null as number | null,
      
      where(field: string, operator?: any, value?: any) {
        if (arguments.length === 2) {
          this.conditions.push({ field, operator: '=', value: operator })
        } else {
          this.conditions.push({ field, operator, value })
        }
        return this
      },
      
      whereRaw(sql: string) {
        this.conditions.push({ type: 'raw', sql })
        return this
      },
      
      orderBy(field: string, direction: 'ASC' | 'DESC') {
        this.ordering = { field, direction }
        return this
      },
      
      limit(count: number) {
        this.limitValue = count
        return this
      },
      
      offset(count: number) {
        this.offsetValue = count
        return this
      },
      
      async execute(): Promise<PaymentTransaction[]> {
        // Mock implementation - in reality, execute SQL query
        return []
      }
    }
  }
}