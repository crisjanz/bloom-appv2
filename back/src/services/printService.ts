import { PrismaClient, PrintJobStatus, PrintJobType, Order } from '@prisma/client';

const prisma = new PrismaClient();

export class PrintService {
  /**
   * Queue a print job for an order (non-blocking)
   */
  async queuePrintJob(params: {
    type: PrintJobType;
    orderId?: string;
    order: Order;
    template: string;
    priority?: number;
  }): Promise<void> {
    try {
      await prisma.printJob.create({
        data: {
          type: params.type,
          orderId: params.orderId,
          data: params.order as any,
          template: params.template,
          priority: params.priority ?? 0,
          status: PrintJobStatus.PENDING
        }
      });
      console.log(`🖨️ Print job queued: ${params.type} for order ${params.orderId ?? '(manual)'}`);
    } catch (error) {
      console.error('Failed to queue print job:', error);
      throw error;
    }
  }

  /**
   * Get pending jobs for an agent (polling)
   */
  async getPendingJobs(agentId: string, limit: number = 10) {
    return prisma.printJob.findMany({
      where: { status: PrintJobStatus.PENDING },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit,
      include: {
        order: {
          include: {
            customer: true,
            recipientCustomer: {
              include: { addresses: true }
            },
            deliveryAddress: true,
            orderItems: true
          }
        }
      }
    });
  }

  /**
   * Update job status (agent reports progress)
   */
  async updateJobStatus(
    jobId: string,
    status: PrintJobStatus,
    agentId?: string,
    errorMessage?: string
  ) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status,
        agentId,
        errorMessage,
        printedAt: status === PrintJobStatus.COMPLETED ? new Date() : undefined,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Fetch job history (for future UI)
   */
  async getJobHistory(filters: {
    status?: PrintJobStatus;
    limit?: number;
    offset?: number;
  }) {
    return prisma.printJob.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            type: true,
            createdAt: true
          }
        }
      }
    });
  }

  /**
   * Retry failed job (reset to pending)
   */
  async retryJob(jobId: string) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.PENDING,
        agentId: null,
        errorMessage: null,
        printedAt: null,
        updatedAt: new Date()
      }
    });
  }
}

export const printService = new PrintService();
