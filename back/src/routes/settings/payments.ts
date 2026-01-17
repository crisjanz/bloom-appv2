import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  fetchPaymentSettings,
  updateGeneralPaymentSettings,
  updateProviderSettings,
  updateBuiltInPaymentMethods,
  listOfflinePaymentMethods,
  createOfflinePaymentMethod,
  updateOfflinePaymentMethod,
  deleteOfflinePaymentMethod,
  reorderOfflinePaymentMethods,
} from '../../services/paymentSettingsService';
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [settings, offlineMethods] = await Promise.all([
      fetchPaymentSettings(),
      listOfflinePaymentMethods(),
    ]);

    res.json({
      ...settings,
      offlineMethods,
    });
  } catch (error) {
    console.error('Failed to fetch payment settings:', error);
    res.status(500).json({ error: 'Failed to fetch payment settings' });
  }
});

router.put('/general', async (req, res) => {
  try {
    const settings = await updateGeneralPaymentSettings(req.body);
    res.json(settings);
  } catch (error) {
    handleError(res, error, 'Failed to update general payment settings');
  }
});

router.put('/providers/:provider', async (req, res) => {
  try {
    const settings = await updateProviderSettings(req.params.provider, req.body);
    paymentProviderFactory.invalidateCache();
    res.json(settings);
  } catch (error) {
    handleError(res, error, `Failed to update ${req.params.provider} settings`);
  }
});

router.put('/built-in', async (req, res) => {
  try {
    const settings = await updateBuiltInPaymentMethods(req.body);
    res.json(settings);
  } catch (error) {
    handleError(res, error, 'Failed to update built-in payment methods');
  }
});

router.get('/offline-methods', async (_req, res) => {
  try {
    const methods = await listOfflinePaymentMethods();
    res.json(methods);
  } catch (error) {
    console.error('Failed to list offline payment methods:', error);
    res.status(500).json({ error: 'Failed to list offline payment methods' });
  }
});

router.post('/offline-methods', async (req, res) => {
  try {
    const method = await createOfflinePaymentMethod(req.body);
    res.status(201).json(method);
  } catch (error) {
    handleError(res, error, 'Failed to create offline payment method');
  }
});

router.put('/offline-methods/:id', async (req, res) => {
  try {
    const method = await updateOfflinePaymentMethod(req.params.id, req.body);
    res.json(method);
  } catch (error) {
    handleError(res, error, 'Failed to update offline payment method');
  }
});

router.patch('/offline-methods/reorder', async (req, res) => {
  try {
    const { order } = req.body as { order: string[] };
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: '"order" must be an array of method ids' });
    }

    const methods = await reorderOfflinePaymentMethods(order);
    res.json(methods);
  } catch (error) {
    handleError(res, error, 'Failed to reorder offline payment methods');
  }
});

router.delete('/offline-methods/:id', async (req, res) => {
  try {
    await deleteOfflinePaymentMethod(req.params.id);
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Failed to delete offline payment method');
  }
});

function handleError(res: Response, error: unknown, fallbackMessage: string) {
  console.error(fallbackMessage, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A method with this code already exists' });
      return;
    }
  }

  if (error instanceof Error) {
    const message = error.message || fallbackMessage;
    if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('unsupported') || message.toLowerCase().includes('required')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: fallbackMessage, detail: message });
    return;
  }

  res.status(500).json({ error: fallbackMessage });
}

export default router;
