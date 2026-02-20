import { Router } from 'express';
import { CommunicationType } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../lib/prisma';

const router = Router();

const paramsSchema = z.object({
  orderId: z.string().min(1),
});

const querySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined) return 20;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) return 20;
      return Math.min(100, Math.max(1, Math.floor(parsed)));
    }),
  before: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    }),
});

type TimelineEntry = {
  id: string;
  type: string;
  summary: string;
  details?: Record<string, unknown>;
  actorName?: string;
  createdAt: string;
};

const toIso = (value: Date) => value.toISOString();

const toActivityEntry = (activity: {
  id: string;
  type: string;
  summary: string;
  details: unknown;
  actorName: string | null;
  actor: { name: string } | null;
  createdAt: Date;
}): TimelineEntry => {
  const details =
    activity.details && typeof activity.details === 'object' && !Array.isArray(activity.details)
      ? (activity.details as Record<string, unknown>)
      : undefined;

  return {
    id: `activity_${activity.id}`,
    type: activity.type,
    summary: activity.summary,
    details,
    actorName: activity.actorName || activity.actor?.name || undefined,
    createdAt: toIso(activity.createdAt),
  };
};

const toCommunicationSummary = (communication: {
  type: CommunicationType;
  recipient: string | null;
  subject: string | null;
}) => {
  switch (communication.type) {
    case CommunicationType.SMS_SENT:
      return communication.recipient ? `SMS sent to ${communication.recipient}` : 'SMS sent';
    case CommunicationType.SMS_RECEIVED:
      return communication.recipient ? `SMS received from ${communication.recipient}` : 'SMS received';
    case CommunicationType.EMAIL_SENT:
      return communication.subject ? `Email sent: ${communication.subject}` : 'Email sent';
    case CommunicationType.NOTE:
      return 'Note added';
    case CommunicationType.PHONE_CALL:
      return 'Phone call logged';
    default:
      return 'Communication logged';
  }
};

const toCommunicationEntry = (communication: {
  id: string;
  type: CommunicationType;
  status: string | null;
  quickActions: string[];
  message: string;
  recipient: string | null;
  subject: string | null;
  sentVia: string | null;
  isAutomatic: boolean;
  employee: { name: string } | null;
  createdAt: Date;
}): TimelineEntry => ({
  id: `communication_${communication.id}`,
  type: communication.type,
  summary: toCommunicationSummary(communication),
  details: {
    status: communication.status,
    message: communication.message,
    recipient: communication.recipient,
    subject: communication.subject,
    sentVia: communication.sentVia,
    isAutomatic: communication.isAutomatic,
    quickActions: communication.quickActions,
  },
  actorName: communication.employee?.name || undefined,
  createdAt: toIso(communication.createdAt),
});

const formatPrintType = (type: string) =>
  type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const toPrintSummary = (printJob: { type: string; status: string; printerName: string | null }) => {
  const typeLabel = formatPrintType(printJob.type);
  const printerSuffix = printJob.printerName ? ` on ${printJob.printerName}` : '';

  if (printJob.status === 'FAILED') {
    return `Print failed: ${typeLabel}${printerSuffix}`;
  }

  if (printJob.status === 'COMPLETED') {
    return `Printed ${typeLabel}${printerSuffix}`;
  }

  if (printJob.status === 'PRINTING') {
    return `Printing ${typeLabel}${printerSuffix}`;
  }

  return `Print queued: ${typeLabel}${printerSuffix}`;
};

const toPrintEntry = (printJob: {
  id: string;
  type: string;
  status: string;
  template: string;
  agentId: string | null;
  errorMessage: string | null;
  printerName: string | null;
  createdAt: Date;
  printedAt: Date | null;
}): TimelineEntry => ({
  id: `print_${printJob.id}`,
  type: 'PRINT',
  summary: toPrintSummary(printJob),
  details: {
    printType: printJob.type,
    status: printJob.status,
    template: printJob.template,
    printerName: printJob.printerName,
    agentId: printJob.agentId,
    errorMessage: printJob.errorMessage,
    printedAt: printJob.printedAt ? toIso(printJob.printedAt) : null,
  },
  createdAt: toIso(printJob.createdAt),
});

router.get('/:orderId/activity', async (req, res) => {
  try {
    const { orderId } = paramsSchema.parse(req.params);
    const { limit, before } = querySchema.parse(req.query);

    const orderExists = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!orderExists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const createdAtFilter = before ? { lt: before } : undefined;
    const fetchLimit = limit + 1;

    const [activities, communications, printJobs] = await Promise.all([
      prisma.orderActivity.findMany({
        where: {
          orderId,
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
        include: {
          actor: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.orderCommunication.findMany({
        where: {
          orderId,
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
        include: {
          employee: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.printJob.findMany({
        where: {
          orderId,
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
        select: {
          id: true,
          type: true,
          status: true,
          template: true,
          agentId: true,
          errorMessage: true,
          printerName: true,
          createdAt: true,
          printedAt: true,
        },
      }),
    ]);

    const merged = [
      ...activities.map(toActivityEntry),
      ...communications.map(toCommunicationEntry),
      ...printJobs.map(toPrintEntry),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasMore = merged.length > limit;
    const entries = hasMore ? merged.slice(0, limit) : merged;
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    return res.json({
      success: true,
      entries,
      pagination: {
        limit,
        hasMore,
        nextBefore: hasMore && lastEntry ? lastEntry.createdAt : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request payload',
        details: error.errors,
      });
    }

    console.error('Error loading order activity timeline:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load order activity timeline',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
