import { PrismaClient, PrintJobStatus, PrintJobType, Order } from '@prisma/client';
import { WebSocketServer } from 'ws';
import { buildRouteViewUrl, generateRouteToken } from '../utils/routeToken';
import { printSettingsService } from './printSettingsService';
import { buildOrderTicketPdf } from '../templates/order-ticket-pdf';
import { generateOrderQRCodeBuffer } from '../utils/qrCodeGenerator';
import { getOrderNumberPrefix } from '../utils/orderNumberSettings';

const prisma = new PrismaClient();

export type PrintJobRoutingResult =
  | { action: 'skipped'; reason: string; type: PrintJobType }
  | { action: 'browser-print'; type: PrintJobType; template: string; data: any; copies: number }
  | {
      action: 'queued';
      type: PrintJobType;
      jobId: string;
      agentType: string;
      printerName: string | null;
      printerTray: number | null;
      copies: number;
    };

export class PrintService {
  private wss: WebSocketServer | null = null;

  /**
   * Set WebSocket server for broadcasting
   */
  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  /**
   * Queue a print job for an order (non-blocking)
   */
  async queuePrintJob(params: {
    type: PrintJobType;
    orderId?: string;
    order: Order;
    template: string;
    priority?: number;
    orderNumberPrefix?: string;
  }): Promise<PrintJobRoutingResult> {
    try {
      const config = await printSettingsService.getConfigForType(params.type);

      if (!config.enabled) {
        console.log(`🖨️ Print job skipped (disabled): ${params.type}`);
        return { action: 'skipped', reason: 'disabled', type: params.type };
      }

      let jobData: any = params.order as any;
      let driverRouteUrl: string | null = null;

      if (params.type === PrintJobType.ORDER_TICKET) {
        const orderNumberPrefix = params.orderNumberPrefix ?? await getOrderNumberPrefix(prisma);

        try {
          const orderId = params.orderId || (params.order as any)?.id;

          if (orderId) {
            const token = generateRouteToken(orderId);
            driverRouteUrl = buildRouteViewUrl(token);
            jobData = {
              ...jobData,
              driverRouteToken: token,
              driverRouteUrl,
            };
          }
        } catch (error) {
          console.error('Failed to generate driver route token for print job:', error);
        }

        if (config.destination !== 'browser') {
          try {
            const qrBuffer = driverRouteUrl ? await generateOrderQRCodeBuffer(driverRouteUrl) : null;
            const pdfBuffer = await buildOrderTicketPdf(jobData, {
              qrCodeBuffer: qrBuffer,
              orderNumberPrefix,
            });
            jobData = { ...jobData, pdfBase64: pdfBuffer.toString('base64') };
          } catch (error) {
            console.error('Failed to generate order ticket PDF for print job:', error);
          }
        }
      }

      if (config.destination === 'browser') {
        return {
          action: 'browser-print',
          type: params.type,
          template: params.template,
          data: jobData,
          copies: config.copies
        };
      }

      const printJob = await prisma.printJob.create({
        data: {
          type: params.type,
          orderId: params.orderId,
          data: jobData,
          template: params.template,
          priority: params.priority ?? 0,
          status: PrintJobStatus.PENDING,
          agentType: config.destination,
          printerName: config.printerName ?? null,
          printerTray: config.printerTray ?? null,
          copies: config.copies
        }
      });
      console.log(`🖨️ Print job queued: ${params.type} for order ${params.orderId ?? '(manual)'}`);

      // Broadcast to all connected print agents via WebSocket
      if (this.wss) {
        const message = JSON.stringify({
          type: 'PRINT_JOB',
          job: {
            id: printJob.id,
            type: printJob.type,
            orderId: printJob.orderId,
            agentType: printJob.agentType,
            printerName: printJob.printerName,
            printerTray: printJob.printerTray,
            copies: printJob.copies,
            data: jobData,
            template: printJob.template,
            priority: printJob.priority,
            createdAt: printJob.createdAt
          }
        });

        this.wss.clients.forEach((client) => {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
            console.log(`📤 Print job sent to agent via WebSocket: ${printJob.id}`);
          }
        });
      }
      return {
        action: 'queued',
        type: params.type,
        jobId: printJob.id,
        agentType: printJob.agentType ?? config.destination,
        printerName: printJob.printerName ?? null,
        printerTray: printJob.printerTray ?? null,
        copies: printJob.copies
      };
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
   * Retry failed job (reset to pending and re-broadcast)
   */
  async retryJob(jobId: string) {
    const job = await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.PENDING,
        agentId: null,
        errorMessage: null,
        printedAt: null,
        updatedAt: new Date()
      },
      include: {
        order: {
          include: {
            customer: true,
            recipientCustomer: { include: { addresses: true } },
            deliveryAddress: true,
            orderItems: true
          }
        }
      }
    });

    // Re-broadcast so Electron agent picks it up immediately
    if (this.wss) {
      const message = JSON.stringify({
        type: 'PRINT_JOB',
        job: {
          id: job.id,
          type: job.type,
          orderId: job.orderId,
          agentType: job.agentType,
          printerName: job.printerName,
          printerTray: job.printerTray,
          copies: job.copies,
          data: job.data,
          template: job.template,
          priority: job.priority,
          createdAt: job.createdAt
        }
      });

      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(message);
          console.log(`📤 Retry print job sent to agent via WebSocket: ${job.id}`);
        }
      });
    }

    return job;
  }
}

export const printService = new PrintService();
