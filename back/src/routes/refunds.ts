import express from 'express';
import refundService from '../services/refundService';
import externalProviderService from '../services/externalProviderService';

const router = express.Router();

router.post('/refunds', async (req, res) => {
  try {
    const refund = await refundService.processRefund(req.body);
    res.json(refund);
  } catch (error) {
    console.error('Refund processing failed:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

router.get('/refunds/:refundNumber', async (req, res) => {
  try {
    const refund = await refundService.getRefundDetails(req.params.refundNumber);
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    res.json(refund);
  } catch (error) {
    console.error('Failed to fetch refund:', error);
    res.status(500).json({ error: 'Failed to fetch refund' });
  }
});

router.get('/external-providers', async (req, res) => {
  try {
    const providers = await externalProviderService.getAllProviders();
    res.json(providers);
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.post('/external-providers', async (req, res) => {
  try {
    const provider = await externalProviderService.createProvider(req.body);
    res.json(provider);
  } catch (error) {
    console.error('Failed to create provider:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

router.put('/external-providers/:id', async (req, res) => {
  try {
    const provider = await externalProviderService.updateProvider(req.params.id, req.body);
    res.json(provider);
  } catch (error) {
    console.error('Failed to update provider:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

router.delete('/external-providers/:id', async (req, res) => {
  try {
    await externalProviderService.deleteProvider(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete provider:', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

export default router;
