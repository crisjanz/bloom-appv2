import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, PrintJobStatus } from '@prisma/client';
import { printService } from '../../services/printService';

const router = Router();
const prisma = new PrismaClient();

const updateStatusSchema = z.object({
  status: z.enum(['PRINTING', 'COMPLETED', 'FAILED']),
  agentId: z.string().optional(),
  errorMessage: z.string().optional(),
  printedAt: z.string().datetime().optional()
});

const createJobSchema = z.object({
  type: z.enum(['RECEIPT', 'ORDER_TICKET', 'REPORT']),
  orderId: z.string(),
  template: z.string(),
  priority: z.number().int().optional()
});

// Get print job stats for header badge (failed + stuck pending)
router.get('/stats', async (req, res) => {
  try {
    const stuckThresholdSeconds = 30;
    const stuckThreshold = new Date(Date.now() - stuckThresholdSeconds * 1000);

    const [failedCount, stuckPendingCount] = await Promise.all([
      prisma.printJob.count({
        where: { status: PrintJobStatus.FAILED }
      }),
      prisma.printJob.count({
        where: {
          status: PrintJobStatus.PENDING,
          createdAt: { lt: stuckThreshold }
        }
      })
    ]);

    res.json({
      success: true,
      failedCount,
      stuckPendingCount,
      totalIssues: failedCount + stuckPendingCount
    });
  } catch (error) {
    console.error('Error fetching print job stats:', error);
    res.status(500).json({ error: 'Failed to fetch print job stats' });
  }
});

// Get recent print jobs for dashboard widget
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const stuckThresholdSeconds = 30;
    const stuckThreshold = new Date(Date.now() - stuckThresholdSeconds * 1000);

    const jobs = await prisma.printJob.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true
          }
        }
      }
    });

    // Add isStuck flag for pending jobs older than threshold
    const jobsWithStatus = jobs.map(job => ({
      ...job,
      isStuck: job.status === PrintJobStatus.PENDING && job.createdAt < stuckThreshold
    }));

    res.json({ success: true, jobs: jobsWithStatus });
  } catch (error) {
    console.error('Error fetching recent print jobs:', error);
    res.status(500).json({ error: 'Failed to fetch recent print jobs' });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const { agentId, limit } = req.query;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'agentId query parameter required' });
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const jobs = await printService.getPendingJobs(agentId, limitNum);

    res.json({ jobs });
  } catch (error) {
    console.error('Error fetching pending print jobs:', error);
    res.status(500).json({ error: 'Failed to fetch print jobs' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { status, limit, offset } = req.query;

    const jobs = await printService.getJobHistory({
      status: status ? (status as PrintJobStatus) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    });

    res.json({ jobs });
  } catch (error) {
    console.error('Error fetching print job history:', error);
    res.status(500).json({ error: 'Failed to fetch job history' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = updateStatusSchema.parse(req.body);

    const updatedJob = await printService.updateJobStatus(
      id,
      payload.status as PrintJobStatus,
      payload.agentId,
      payload.errorMessage
    );

    console.log(`🖨️ Print job ${id} status updated: ${payload.status}`);
    res.json(updatedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating print job status:', error);
    res.status(500).json({ error: 'Failed to update print job' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.printJob.delete({ where: { id } });
    console.log(`🗑️ Print job ${id} deleted`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting print job:', error);
    res.status(500).json({ error: 'Failed to delete print job' });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.printJob.findUnique({ where: { id } });

    if (!job) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    // Allow retry for FAILED or stuck PENDING jobs
    if (job.status !== PrintJobStatus.FAILED && job.status !== PrintJobStatus.PENDING) {
      return res.status(400).json({ error: 'Only failed or pending jobs can be retried' });
    }

    const retried = await printService.retryJob(id);
    console.log(`🔄 Print job ${id} queued for retry`);
    res.json({ success: true, job: retried });
  } catch (error) {
    console.error('Error retrying print job:', error);
    res.status(500).json({ error: 'Failed to retry print job' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = createJobSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        customer: true,
        recipientCustomer: {
          include: { addresses: true }
        },
        deliveryAddress: true,
        orderItems: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const result = await printService.queuePrintJob({
      type: payload.type,
      orderId: order.id,
      order,
      template: payload.template,
      priority: payload.priority ?? 0
    });

    const statusCode = result.action === 'queued' ? 201 : 200;
    res.status(statusCode).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating print job:', error);
    res.status(500).json({ error: 'Failed to create print job' });
  }
});

export default router;
