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

router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.printJob.findUnique({ where: { id } });

    if (!job) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    if (job.status !== PrintJobStatus.FAILED) {
      return res.status(400).json({ error: 'Only failed jobs can be retried' });
    }

    const retried = await printService.retryJob(id);
    console.log(`🔄 Print job ${id} queued for retry`);
    res.json(retried);
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

    await printService.queuePrintJob({
      type: payload.type,
      orderId: order.id,
      order,
      template: payload.template,
      priority: payload.priority ?? 0
    });

    res.status(201).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating print job:', error);
    res.status(500).json({ error: 'Failed to create print job' });
  }
});

export default router;
