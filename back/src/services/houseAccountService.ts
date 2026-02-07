import prisma from '../lib/prisma';
import { HouseAccountEntryType, Prisma } from '@prisma/client';

const startOfDay = (dateString: string) => new Date(`${dateString}T00:00:00`);
const endOfDay = (dateString: string) => new Date(`${dateString}T23:59:59.999`);

const buildDateRange = (from?: string, to?: string) => {
  const range: Prisma.DateTimeFilter = {};
  if (from) {
    range.gte = startOfDay(from);
  }
  if (to) {
    range.lte = endOfDay(to);
  }
  return Object.keys(range).length > 0 ? range : undefined;
};

const getLatestEntry = async (customerId: string, tx: Prisma.TransactionClient | typeof prisma) => {
  return tx.houseAccountLedger.findFirst({
    where: { customerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
};

export class HouseAccountService {
  async getBalance(customerId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
    const latest = await getLatestEntry(customerId, tx);
    return latest?.balance ?? 0;
  }

  async listAccounts(hasBalance = false) {
    const customers = await prisma.customer.findMany({
      where: { isHouseAccount: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        houseAccountTerms: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const accounts = await Promise.all(
      customers.map(async (customer) => {
        const latest = await getLatestEntry(customer.id, prisma);
        const currentBalance = latest?.balance ?? 0;
        if (hasBalance && currentBalance === 0) {
          return null;
        }

        return {
          customerId: customer.id,
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email,
          phone: customer.phone,
          terms: customer.houseAccountTerms || 'NET_30',
          currentBalance,
          lastActivity: latest?.createdAt ?? null,
        };
      })
    );

    return accounts.filter(Boolean);
  }

  async getAccountDetail(
    customerId: string,
    options: { from?: string; to?: string; page: number; pageSize: number }
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        houseAccountTerms: true,
        houseAccountNotes: true,
        isHouseAccount: true,
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const balance = await this.getBalance(customerId, prisma);

    const createdAt = buildDateRange(options.from, options.to);
    const where: Prisma.HouseAccountLedgerWhereInput = {
      customerId,
      ...(createdAt ? { createdAt } : {}),
    };

    const skip = (options.page - 1) * options.pageSize;

    const [total, ledger] = await Promise.all([
      prisma.houseAccountLedger.count({ where }),
      prisma.houseAccountLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.pageSize,
        include: {
          order: {
            select: { id: true, orderNumber: true },
          },
        },
      }),
    ]);

    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      houseAccount: {
        terms: customer.houseAccountTerms || 'NET_30',
        notes: customer.houseAccountNotes || '',
        currentBalance: balance,
        isHouseAccount: customer.isHouseAccount,
      },
      ledger,
      pagination: {
        page: options.page,
        pageSize: options.pageSize,
        total,
      },
    };
  }

  async updateSettings(customerId: string, payload: { terms?: string; notes?: string | null }) {
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        houseAccountTerms: payload.terms,
        houseAccountNotes: payload.notes ?? null,
      },
      select: {
        houseAccountTerms: true,
        houseAccountNotes: true,
        isHouseAccount: true,
      },
    });

    return updated;
  }

  async enableAccount(customerId: string) {
    return prisma.customer.update({
      where: { id: customerId },
      data: { isHouseAccount: true },
      select: { id: true, isHouseAccount: true },
    });
  }

  async disableAccount(customerId: string) {
    return prisma.customer.update({
      where: { id: customerId },
      data: { isHouseAccount: false },
      select: { id: true, isHouseAccount: true },
    });
  }

  async applyPayment(payload: {
    customerId: string;
    amount: number;
    reference?: string;
    notes?: string;
    employeeId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const latest = await getLatestEntry(payload.customerId, tx);
      const previousBalance = latest?.balance ?? 0;
      const normalizedAmount = Math.abs(payload.amount) * -1;
      const nextBalance = previousBalance + normalizedAmount;
      let description = 'Payment received';
      if (payload.reference) {
        description += ` - ${payload.reference}`;
      }
      if (payload.notes) {
        description += ` (${payload.notes})`;
      }

      return tx.houseAccountLedger.create({
        data: {
          customerId: payload.customerId,
          type: HouseAccountEntryType.PAYMENT,
          amount: normalizedAmount,
          balance: nextBalance,
          description,
          reference: payload.reference || null,
          createdBy: payload.employeeId || null,
        },
      });
    });
  }

  async addAdjustment(payload: {
    customerId: string;
    amount: number;
    description: string;
    employeeId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const latest = await getLatestEntry(payload.customerId, tx);
      const previousBalance = latest?.balance ?? 0;
      const nextBalance = previousBalance + payload.amount;

      return tx.houseAccountLedger.create({
        data: {
          customerId: payload.customerId,
          type: HouseAccountEntryType.ADJUSTMENT,
          amount: payload.amount,
          balance: nextBalance,
          description: payload.description,
          createdBy: payload.employeeId || null,
        },
      });
    });
  }

  async generateStatement(payload: { customerId: string; from?: string; to?: string }) {
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        houseAccountTerms: true,
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const createdAt = buildDateRange(payload.from, payload.to);

    const where: Prisma.HouseAccountLedgerWhereInput = {
      customerId: payload.customerId,
      ...(createdAt ? { createdAt } : {}),
    };

    const openingBalanceEntry = payload.from
      ? await prisma.houseAccountLedger.findFirst({
          where: {
            customerId: payload.customerId,
            createdAt: { lt: startOfDay(payload.from) },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        })
      : null;

    const entries = await prisma.houseAccountLedger.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        order: {
          select: { id: true, orderNumber: true },
        },
      },
    });

    const openingBalance = openingBalanceEntry?.balance ?? 0;
    const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : openingBalance;

    const charges = entries
      .filter((entry) => entry.type === HouseAccountEntryType.CHARGE)
      .map((entry) => ({
        date: entry.createdAt,
        orderId: entry.order?.id ?? null,
        orderNumber: entry.order?.orderNumber ?? null,
        description: entry.description,
        reference: entry.reference ?? null,
        amount: entry.amount,
      }));

    const payments = entries
      .filter((entry) => entry.type === HouseAccountEntryType.PAYMENT)
      .map((entry) => ({
        date: entry.createdAt,
        reference: entry.reference ?? null,
        description: entry.description,
        amount: entry.amount,
      }));

    const adjustments = entries
      .filter((entry) => entry.type === HouseAccountEntryType.ADJUSTMENT)
      .map((entry) => ({
        date: entry.createdAt,
        description: entry.description,
        amount: entry.amount,
      }));

    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        terms: customer.houseAccountTerms || 'NET_30',
      },
      statementPeriod: {
        from: payload.from || null,
        to: payload.to || null,
      },
      openingBalance,
      charges,
      payments,
      adjustments,
      closingBalance,
    };
  }
}

export const houseAccountService = new HouseAccountService();
