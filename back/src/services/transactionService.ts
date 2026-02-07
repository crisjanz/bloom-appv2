import prisma from '../lib/prisma';
import { HouseAccountEntryType, Prisma } from '@prisma/client';
import { format } from 'date-fns';

export interface CreateTransactionData {
  customerId: string;
  employeeId?: string;
  channel: 'POS' | 'PHONE' | 'WEBSITE';
  totalAmount: number;
  taxAmount?: number;
  tipAmount?: number;
  notes?: string;
  receiptEmail?: string;
  orderIds: string[];
  paymentMethods: PaymentMethodData[];
  isAdjustment?: boolean;
  orderPaymentAllocations?: OrderPaymentAllocation[];
}

export interface PaymentMethodData {
  type: 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'CHECK' | 'COD' | 'HOUSE_ACCOUNT' | 'OFFLINE' | 'EXTERNAL';
  provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
  amount: number;
  providerTransactionId?: string;
  providerMetadata?: any;
  cardLast4?: string;
  cardBrand?: string;
  giftCardNumber?: string;
  checkNumber?: string;
  offlineMethodId?: string;
}

export interface OrderPaymentAllocation {
  orderId: string;
  amount: number;
}

export interface TransactionQueryFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  provider?: string;
  channel?: string;
  search?: string;
  paymentMethod?: string;
}

export interface TransactionSearchResult {
  transactions: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  summary: {
    totalCount: number;
    totalAmount: number;
    totalTax: number;
    totalTips: number;
    totalRefunded: number;
    netAmount: number;
    averageAmount: number;
    statusBreakdown: Array<{
      status: string;
      count: number;
      amount: number;
    }>;
    providerBreakdown: Array<{
      key: string;
      type: string;
      provider: string | null;
      label: string;
      count: number;
      amount: number;
    }>;
    channelBreakdown: Array<{
      channel: string;
      count: number;
      amount: number;
    }>;
  };
}

/**
 * Parse a date string (YYYY-MM-DD) in the business timezone
 * Returns a Date object representing that date at midnight in business timezone
 */
function parseBusinessDate(dateString: string): Date | null {
  try {
    // Parse date components
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return null;

    // Determine if this date is in DST (PDT) or standard time (PST)
    // DST in Pacific Time: March (2) to November (10)
    const monthIdx = month - 1; // Convert to 0-based
    const isDST = monthIdx >= 2 && monthIdx <= 10;
    const tzOffsetHours = isDST ? 7 : 8; // PDT = UTC-7, PST = UTC-8

    // Create Date object representing midnight in business timezone
    // midnight PDT = 07:00 UTC, midnight PST = 08:00 UTC
    const date = new Date(Date.UTC(year, monthIdx, day, tzOffsetHours, 0, 0, 0));

    return date;
  } catch (error) {
    console.error('Error parsing business date:', error);
    return null;
  }
}

class TransactionService {
  /**
   * Generate next PT-XXXX transaction number
   */
  async generateTransactionNumber(): Promise<string> {
    const result = await prisma.$transaction(async (tx) => {
      // Get or create the counter
      let counter = await tx.transactionCounter.findFirst();
      
      if (!counter) {
        // Initialize counter if it doesn't exist
        counter = await tx.transactionCounter.create({
          data: {
            currentValue: 1,
            prefix: 'PT'
          }
        });
      } else {
        // Increment the counter
        counter = await tx.transactionCounter.update({
          where: { id: counter.id },
          data: {
            currentValue: counter.currentValue + 1
          }
        });
      }
      
      return counter;
    });
    
    // Format as PT-00001, PT-00002, etc.
    const paddedNumber = result.currentValue.toString().padStart(5, '0');
    return `${result.prefix}-${paddedNumber}`;
  }

  /**
   * Create a new payment transaction with all related data
   */
  async createTransaction(data: CreateTransactionData) {
    const transactionNumber = await this.generateTransactionNumber();
    const isAdjustment = Boolean(data.isAdjustment);
    const hasHouseAccount = data.paymentMethods.some((method) => method.type === 'HOUSE_ACCOUNT');
    const hasNonHouseAccount = data.paymentMethods.some((method) => method.type !== 'HOUSE_ACCOUNT');
    const houseAccountReference = hasHouseAccount
      ? data.paymentMethods
          .filter((method) => method.type === 'HOUSE_ACCOUNT')
          .map((method) => {
            const reference = method.providerMetadata?.reference;
            return typeof reference === 'string' ? reference.trim() : '';
          })
          .find((reference) => reference.length > 0)
      : undefined;

    if (hasHouseAccount && hasNonHouseAccount) {
      throw new Error('House account payments cannot be combined with other payment methods');
    }
    
    return await prisma.$transaction(async (tx) => {
      if (hasHouseAccount) {
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId },
          select: { id: true, isHouseAccount: true }
        });

        if (!customer) {
          throw new Error(`Customer not found for transaction ${transactionNumber}`);
        }

        if (!customer.isHouseAccount) {
          throw new Error('Customer does not have house account enabled');
        }
      }

      // Create the main payment transaction
      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          transactionNumber,
          channel: data.channel,
          totalAmount: data.totalAmount,
          taxAmount: data.taxAmount || 0,
          tipAmount: data.tipAmount || 0,
          customerId: data.customerId,
          employeeId: data.employeeId,
          notes: data.notes,
          receiptEmail: data.receiptEmail,
          status: 'PROCESSING'
        }
      });

      // Create payment methods
      console.log(`💳 Creating ${data.paymentMethods.length} payment methods for ${transactionNumber}`);
      const paymentMethods = await Promise.all(
        data.paymentMethods.map((method, index) => {
          console.log(`  ${index + 1}. ${method.type} - $${(method.amount / 100).toFixed(2)} via ${method.provider}`);
          return tx.paymentMethod.create({
            data: {
              transactionId: paymentTransaction.id,
              type: method.type,
              provider: method.provider,
              amount: method.amount,
              providerTransactionId: method.providerTransactionId,
              providerMetadata: method.providerMetadata,
              cardLast4: method.cardLast4,
              cardBrand: method.cardBrand,
              giftCardNumber: method.giftCardNumber,
              checkNumber: method.checkNumber,
              offlineMethodId: method.offlineMethodId
            }
          });
        })
      );
      console.log(`✅ ${paymentMethods.length} payment methods created for ${transactionNumber}`);

      const normalizedOrderIds = Array.from(
        new Set(
          (isAdjustment
            ? (data.orderPaymentAllocations || []).map((allocation) => allocation?.orderId)
            : data.orderIds || []
          ).filter((orderId): orderId is string => typeof orderId === 'string' && orderId.trim().length > 0)
        )
      );

      if (normalizedOrderIds.length === 0) {
        throw new Error(`No order IDs provided for transaction ${transactionNumber}`);
      }

      const orders = await tx.order.findMany({
        where: { id: { in: normalizedOrderIds } },
        select: isAdjustment
          ? { id: true }
          : {
              id: true,
              orderNumber: true,
              paymentAmount: true,
              deliveryFee: true,
              totalTax: true,
              discount: true,
              orderItems: {
                select: {
                  rowTotal: true
                }
              }
            }
      });

      const orderIdSet = new Set(orders.map((order) => order.id));
      const missingOrderIds = normalizedOrderIds.filter((orderId) => !orderIdSet.has(orderId));
      if (missingOrderIds.length > 0) {
        throw new Error(`Orders not found for transaction ${transactionNumber}: ${missingOrderIds.join(', ')}`);
      }

      const ordersById = new Map(orders.map((order) => [order.id, order]));
      const orderedOrders = normalizedOrderIds
        .map((orderId) => ordersById.get(orderId))
        .filter(Boolean);

      if (isAdjustment) {
        const allocationMap = new Map<string, number>();

        (data.orderPaymentAllocations || []).forEach((allocation) => {
          if (!allocation || typeof allocation.orderId !== 'string') {
            return;
          }
          const nextAmount = (allocationMap.get(allocation.orderId) || 0) + allocation.amount;
          allocationMap.set(allocation.orderId, nextAmount);
        });

        normalizedOrderIds.forEach((orderId) => {
          const allocatedAmount = allocationMap.get(orderId);
          if (!allocatedAmount || allocatedAmount <= 0) {
            throw new Error(`Missing adjustment allocation for order ${orderId} on ${transactionNumber}`);
          }
        });

        await Promise.all(
          normalizedOrderIds.map((orderId) =>
            tx.orderPayment.create({
              data: {
                transactionId: paymentTransaction.id,
                orderId,
                amount: allocationMap.get(orderId) || 0
              }
            })
          )
        );
      } else {
        const orderAmountMap = new Map<string, number>();
        const ordersNeedingPaymentUpdate: Array<{ id: string; amount: number }> = [];

        orders.forEach((order: any) => {
          const itemsTotal = order.orderItems.reduce((sum: number, item: any) => sum + item.rowTotal, 0);
          let amount = order.paymentAmount || 0;

          if (amount <= 0) {
            amount = itemsTotal + (order.deliveryFee || 0) + (order.totalTax || 0) - (order.discount || 0);
            if (amount < 0) {
              amount = 0;
            }
            if (amount > 0) {
              ordersNeedingPaymentUpdate.push({ id: order.id, amount });
            }
          }

          orderAmountMap.set(order.id, amount);
        });

        if (ordersNeedingPaymentUpdate.length > 0) {
          await Promise.all(
            ordersNeedingPaymentUpdate.map((order) =>
              tx.order.update({
                where: { id: order.id },
                data: { paymentAmount: order.amount }
              })
            )
          );
        }

        await Promise.all(
          normalizedOrderIds.map((orderId) =>
            tx.orderPayment.create({
              data: {
                transactionId: paymentTransaction.id,
                orderId,
                amount: orderAmountMap.get(orderId) || 0
              }
            })
          )
        );

        if (hasHouseAccount) {
          const latestEntry = await tx.houseAccountLedger.findFirst({
            where: { customerId: data.customerId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
          });
          let runningBalance = latestEntry?.balance ?? 0;

          for (const order of orderedOrders) {
            if (!order) continue;
            const amount = orderAmountMap.get(order.id) || 0;
            if (amount <= 0) continue;
            runningBalance += amount;
            const orderNumber = (order as any).orderNumber;
            const description = orderNumber ? `Order #${orderNumber}` : 'Order Charge';

            await tx.houseAccountLedger.create({
              data: {
                customerId: data.customerId,
                type: HouseAccountEntryType.CHARGE,
                amount,
                balance: runningBalance,
                description,
                reference: houseAccountReference || null,
                orderId: order.id,
                transactionId: paymentTransaction.id,
                createdBy: data.employeeId || null
              }
            });
          }
        }
      }

      // Update transaction status to completed if all payments succeeded
      const updatedTransaction = await tx.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          customer: true,
          employee: true,
          paymentMethods: true,
          orderPayments: {
            include: {
              order: true
            }
          }
        }
      });

      if (!isAdjustment) {
        // Update all associated orders to PAID status when transaction completes
        await Promise.all(
          normalizedOrderIds.map(orderId =>
            tx.order.update({
              where: { id: orderId },
              data: { status: 'PAID' }
            })
          )
        );
      }

      return updatedTransaction;
    });
  }

  /**
   * Get transaction with all related data
   */
  async getTransaction(transactionNumber: string) {
    return await prisma.paymentTransaction.findUnique({
      where: { transactionNumber },
      include: {
        customer: true,
        employee: true,
        paymentMethods: true,
        orderPayments: {
          include: {
            order: {
              include: {
                orderItems: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        },
        refunds: {
          include: {
            refundMethods: true,
            employee: true,
            orderRefunds: true
          }
        }
      }
    });
  }

  /**
   * Search transactions with filtering, pagination, and summary data
   */
  async searchTransactions(filters: TransactionQueryFilters & { page?: number; limit?: number }): Promise<TransactionSearchResult> {
    const page = !filters.page || filters.page < 1 ? 1 : filters.page;
    const limit = !filters.limit || filters.limit < 1 ? 25 : Math.min(filters.limit, 100);
    const skip = (page - 1) * limit;

    const where = this.buildTransactionWhere(filters);

    const [
      transactions,
      totalCount,
      aggregates,
      statusBreakdown,
      providerBreakdown,
      channelBreakdown,
      refundAggregate
    ] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: true,
          employee: true,
          paymentMethods: {
            include: {
              offlineMethod: true
            }
          },
          orderPayments: {
            include: {
              order: true
            }
          },
          refunds: {
            include: {
              refundMethods: true
            }
          }
        }
      }),
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.aggregate({
        where,
        _sum: {
          totalAmount: true,
          taxAmount: true,
          tipAmount: true
        }
      }),
      prisma.paymentTransaction.groupBy({
        where,
        by: ['status'],
        _count: { _all: true },
        _sum: { totalAmount: true }
      }),
      prisma.paymentMethod.groupBy({
        where: {
          transaction: where
        },
        by: ['type', 'provider'],
        _count: { _all: true },
        _sum: { amount: true }
      }),
      prisma.paymentTransaction.groupBy({
        where,
        by: ['channel'],
        _count: { _all: true },
        _sum: { totalAmount: true }
      }),
      prisma.refund.aggregate({
        where: {
          transaction: where
        },
        _sum: {
          amount: true
        }
      })
    ]);

    const totalAmount = aggregates._sum.totalAmount ?? 0;
    const totalTax = aggregates._sum.taxAmount ?? 0;
    const totalTips = aggregates._sum.tipAmount ?? 0;
    const totalRefunded = refundAggregate._sum.amount ?? 0;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: skip + transactions.length < totalCount
      },
      summary: {
        totalCount,
        totalAmount,
        totalTax,
        totalTips,
        totalRefunded,
        netAmount: totalAmount - totalRefunded,
        averageAmount,
        statusBreakdown: statusBreakdown.map((entry) => ({
          status: entry.status,
          count: entry._count?._all ?? 0,
          amount: entry._sum?.totalAmount ?? 0
        })),
        providerBreakdown: providerBreakdown.map((entry) => ({
          key: this.createProviderKey(entry.type, entry.provider),
          type: entry.type,
          provider: entry.provider ?? null,
          label: this.formatPaymentMethodLabel(entry.type, entry.provider),
          count: entry._count?._all ?? 0,
          amount: entry._sum?.amount ?? 0
        })),
        channelBreakdown: channelBreakdown.map((entry) => ({
          channel: entry.channel,
          count: entry._count?._all ?? 0,
          amount: entry._sum?.totalAmount ?? 0
        }))
      }
    };
  }

  /**
   * Export transactions as CSV for reporting
   */
  async exportTransactions(filters: TransactionQueryFilters): Promise<string> {
    const where = this.buildTransactionWhere(filters);

    const transactions = await prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        employee: true,
        paymentMethods: {
          include: {
            offlineMethod: true
          }
        },
        orderPayments: {
          include: {
            order: true
          }
        },
        refunds: {
          include: {
            refundMethods: true
          }
        }
      }
    });

    const headers = [
      'Transaction Number',
      'Created At',
      'Status',
      'Channel',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Employee',
      'Total Amount',
      'Tax Amount',
      'Tip Amount',
      'Total Refunded',
      'Payment Methods',
      'Orders',
      'Notes'
    ];

    const rows = transactions.map((transaction) => {
      const customerName = transaction.customer
        ? [transaction.customer.firstName, transaction.customer.lastName].filter(Boolean).join(' ').trim()
        : '';

      const paymentMethods = transaction.paymentMethods
        .map((method) => {
          const label = this.formatPaymentMethodLabel(method.type, method.provider);
          return `${label}: ${method.amount.toFixed(2)}`;
        })
        .join('; ');

      const orders = transaction.orderPayments
        .map((orderPayment) => {
          const orderNumber = orderPayment.order?.orderNumber;
          return orderNumber ? `#${orderNumber}` : orderPayment.orderId;
        })
        .join('; ');

      const refundedTotal = transaction.refunds.reduce((sum, refund) => sum + refund.amount, 0);

      return [
        transaction.transactionNumber,
        format(transaction.createdAt, 'yyyy-MM-dd HH:mm'),
        transaction.status,
        transaction.channel,
        customerName,
        transaction.customer?.email ?? '',
        transaction.customer?.phone ?? '',
        transaction.employee?.name ?? '',
        transaction.totalAmount.toFixed(2),
        transaction.taxAmount.toFixed(2),
        transaction.tipAmount.toFixed(2),
        refundedTotal.toFixed(2),
        paymentMethods,
        orders,
        transaction.notes ?? ''
      ].map((value) => this.escapeCsvValue(value)).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Process a refund for a transaction
   */
  async processRefund(transactionId: string, refundData: {
    amount: number;
    reason?: string;
    employeeId?: string;
    refundMethods: {
      paymentMethodType: 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'CHECK' | 'COD';
      provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
      amount: number;
      providerRefundId?: string;
    }[];
  }) {
    return await prisma.$transaction(async (tx) => {
      // Generate refund number (RF-XXXXX)
      const refundNumber = await this.generateRefundNumber(tx);
      
      // Create refund record
      const refund = await tx.refund.create({
        data: {
          transactionId,
          refundNumber,
          amount: refundData.amount,
          reason: refundData.reason,
          employeeId: refundData.employeeId
        }
      });

      // Create refund methods
      await Promise.all(
        refundData.refundMethods.map(method =>
          tx.refundMethod.create({
            data: {
              refundId: refund.id,
              paymentMethodType: method.paymentMethodType,
              provider: method.provider,
              amount: method.amount,
              providerRefundId: method.providerRefundId
            }
          })
        )
      );

      // Update transaction status
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: transactionId },
        include: { refunds: true }
      });

      if (transaction) {
        const totalRefunded = transaction.refunds.reduce((sum, r) => sum + r.amount, 0);
        const newStatus = totalRefunded >= transaction.totalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        
        await tx.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: newStatus }
        });
      }

      return refund;
    });
  }

  /**
   * Generate refund number (RF-XXXXX)
   */
  private async generateRefundNumber(tx: any): Promise<string> {
    // For simplicity, we'll use a similar counter but with RF prefix
    // You could create a separate RefundCounter table if needed
    const count = await tx.refund.count();
    const paddedNumber = (count + 1).toString().padStart(5, '0');
    return `RF-${paddedNumber}`;
  }

  private buildTransactionWhere(filters: TransactionQueryFilters): Prisma.PaymentTransactionWhereInput {
    const where: Prisma.PaymentTransactionWhereInput = {};
    const andConditions: Prisma.PaymentTransactionWhereInput[] = [];

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      andConditions.push({ status: filters.status.toUpperCase() as any });
    }

    if (filters.channel && filters.channel.toUpperCase() !== 'ALL') {
      andConditions.push({ channel: filters.channel.toUpperCase() as any });
    }

    if (filters.startDate || filters.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (filters.startDate) {
        const start = parseBusinessDate(filters.startDate);
        if (start) {
          createdAt.gte = start;
        }
      }

      if (filters.endDate) {
        const end = parseBusinessDate(filters.endDate);
        if (end) {
          end.setHours(23, 59, 59, 999);
          createdAt.lte = end;
        }
      }

      if (Object.keys(createdAt).length > 0) {
        andConditions.push({ createdAt });
      }
    }

    if (filters.provider && filters.provider.toUpperCase() !== 'ALL') {
      andConditions.push({
        paymentMethods: {
          some: {
            provider: filters.provider.toUpperCase() as any
          }
        }
      });
    }

    if (filters.paymentMethod && filters.paymentMethod.trim().length > 0) {
      const value = filters.paymentMethod.trim();
      const offlinePrefix = 'offline:';

      if (value.toLowerCase().startsWith(offlinePrefix)) {
        const offlineId = value.slice(offlinePrefix.length);
        if (offlineId) {
          andConditions.push({
            paymentMethods: {
              some: {
                offlineMethodId: offlineId
              }
            }
          });
        }
      } else {
        const type = value.toUpperCase();
        andConditions.push({
          paymentMethods: {
            some: {
              type: type as any
            }
          }
        });
      }
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim();
      const numericTerm = parseInt(term.replace(/\D/g, ''), 10);

      const searchConditions: Prisma.PaymentTransactionWhereInput[] = [
        {
          transactionNumber: {
            contains: term,
            mode: 'insensitive'
          }
        },
        {
          customer: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term, mode: 'insensitive' } }
              ]
            }
          }
        },
        {
          employee: {
            is: {
              name: {
                contains: term,
                mode: 'insensitive'
              }
            }
          }
        }
      ];

      if (!Number.isNaN(numericTerm)) {
        searchConditions.push({
          orderPayments: {
            some: {
              order: {
                orderNumber: numericTerm
              }
            }
          }
        });
      }

      andConditions.push({
        OR: searchConditions
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }

  private formatPaymentMethodLabel(type: string, provider?: string | null): string {
    const normalizedType = (type || 'UNKNOWN').toUpperCase();
    const normalizedProvider = (provider || '').toUpperCase();

    const typeLabels: Record<string, string> = {
      CARD: 'Card',
      CASH: 'Cash',
      GIFT_CARD: 'Gift Card',
      STORE_CREDIT: 'Store Credit',
      CHECK: 'Check',
      COD: 'Collect on Delivery',
      HOUSE_ACCOUNT: 'House Account',
      OFFLINE: 'Offline',
      EXTERNAL: 'External Provider',
      UNKNOWN: 'Unknown'
    };

    const providerLabels: Record<string, string> = {
      STRIPE: 'Stripe',
      SQUARE: 'Square',
      INTERNAL: 'In-House',
      UNKNOWN: 'Unknown'
    };

    const baseLabel =
      typeLabels[normalizedType] ?? normalizedType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

    if (!normalizedProvider || normalizedProvider === 'INTERNAL') {
      return baseLabel;
    }

    const providerLabel = providerLabels[normalizedProvider] ?? normalizedProvider.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    return `${baseLabel} (${providerLabel})`;
  }

  private createProviderKey(type: string, provider?: string | null): string {
    const normalizedType = (type || 'UNKNOWN').toUpperCase();
    const normalizedProvider = (provider || 'INTERNAL').toUpperCase();
    if (normalizedProvider === 'INTERNAL') {
      return normalizedType;
    }
    return `${normalizedType}__${normalizedProvider}`;
  }

  private escapeCsvValue(value: string): string {
    const needsEscaping = /[",\n]/.test(value);
    if (!needsEscaping) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Get transaction history for a customer
   */
  async getCustomerTransactions(customerId: string) {
    return await prisma.paymentTransaction.findMany({
      where: { customerId },
      include: {
        paymentMethods: {
          include: {
            offlineMethod: true
          }
        },
        orderPayments: {
          include: {
            order: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all transactions for a specific order
   */
  async getOrderTransactions(orderId: string) {
    return await prisma.paymentTransaction.findMany({
      where: {
        orderPayments: {
          some: {
            orderId
          }
        }
      },
      include: {
        customer: true,
        paymentMethods: {
          include: {
            offlineMethod: true
          }
        },
        orderPayments: {
          include: {
            order: true
          }
        },
        refunds: {
          include: {
            refundMethods: true,
            orderRefunds: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get daily transaction summary
   */
  async getDailyTransactionSummary(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'COMPLETED'
      },
      include: {
        paymentMethods: true
      }
    });

    const summary = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
      totalTax: transactions.reduce((sum, t) => sum + t.taxAmount, 0),
      totalTips: transactions.reduce((sum, t) => sum + t.tipAmount, 0),
      paymentMethodBreakdown: {} as Record<string, { count: number; amount: number }>
    };

    // Calculate payment method breakdown
    transactions.forEach(transaction => {
      transaction.paymentMethods.forEach(method => {
        const key = `${method.type}_${method.provider}`;
        if (!summary.paymentMethodBreakdown[key]) {
          summary.paymentMethodBreakdown[key] = { count: 0, amount: 0 };
        }
        summary.paymentMethodBreakdown[key].count++;
        summary.paymentMethodBreakdown[key].amount += method.amount;
      });
    });

    return summary;
  }

}

export default new TransactionService();
