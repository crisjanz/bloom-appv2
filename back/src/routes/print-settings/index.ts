import { Router } from 'express';
import { z } from 'zod';
import { printSettingsService } from '../../services/printSettingsService';
import type { PrintSettingsUpdate } from '../../services/printSettingsService';

const router = Router();

const destinationSchema = z.enum(['browser', 'receipt-agent', 'electron-agent']);

const updateSchema = z.object({
  receiptsEnabled: z.boolean(),
  receiptsDestination: destinationSchema,
  receiptsCopies: z.number().int().min(1).max(3),
  receiptsPrinterName: z.string().trim().min(1).nullable().optional(),
  receiptsPrinterTray: z.number().int().min(1).max(3).nullable().optional(),
  ticketsEnabled: z.boolean(),
  ticketsDestination: destinationSchema,
  ticketsPrinterName: z.string().trim().min(1).nullable().optional(),
  ticketsPrinterTray: z.number().int().min(1).max(3).nullable().optional(),
  documentsEnabled: z.boolean(),
  documentsDestination: destinationSchema,
  documentsPrinterName: z.string().trim().min(1).nullable().optional(),
  documentsPrinterTray: z.number().int().min(1).max(3).nullable().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const settings = await printSettingsService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching print settings:', error);
    res.status(500).json({ error: 'Failed to fetch print settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const payload = updateSchema.parse(req.body) as PrintSettingsUpdate;
    const updated = await printSettingsService.updateSettings(payload);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating print settings:', error);
    res.status(500).json({ error: 'Failed to update print settings' });
  }
});

export default router;
