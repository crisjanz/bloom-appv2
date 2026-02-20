import { OrderActivityType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export interface LogOrderActivityInput {
  tx?: Prisma.TransactionClient;
  orderId: string;
  type: OrderActivityType;
  summary: string;
  details?: unknown;
  actorId?: string | null;
  actorName?: string | null;
}

const toInputJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
};

export async function logOrderActivity({
  tx,
  orderId,
  type,
  summary,
  details,
  actorId,
  actorName,
}: LogOrderActivityInput): Promise<void> {
  if (!orderId || !summary) {
    return;
  }

  const db = tx ?? prisma;

  try {
    await db.orderActivity.create({
      data: {
        orderId,
        type,
        summary,
        details: toInputJsonValue(details),
        actorId: actorId || null,
        actorName: actorName?.trim() || null,
      },
    });
  } catch (error) {
    console.error('Failed to log order activity:', {
      orderId,
      type,
      summary,
      error,
    });
  }
}
