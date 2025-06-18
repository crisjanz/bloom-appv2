import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/settings/tax-rates - Get all tax rates
router.get('/', async (req, res) => {
  try {
    const taxRates = await prisma.taxRate.findMany({
      orderBy: {
        sortOrder: 'asc'
      }
    });

    res.json({
      success: true,
      taxRates
    });
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax rates'
    });
  }
});

// POST /api/settings/tax-rates - Create new tax rate
router.post('/', async (req, res) => {
  try {
    const { name, rate, isActive, sortOrder, description } = req.body;

    // Validate required fields
    if (!name || rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and rate are required'
      });
    }

    // Validate rate is a number between 0 and 100
    if (typeof rate !== 'number' || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Rate must be a number between 0 and 100'
      });
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        name: name.trim(),
        rate: parseFloat(rate.toFixed(2)), // Ensure 2 decimal places
        isActive: isActive ?? true,
        sortOrder: sortOrder || 1,
        description: description?.trim() || null
      }
    });

    res.status(201).json({
      success: true,
      taxRate
    });
  } catch (error) {
    console.error('Error creating tax rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tax rate'
    });
  }
});

// PUT /api/settings/tax-rates/:id - Update tax rate
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rate, isActive, sortOrder, description } = req.body;

    // Check if tax rate exists
    const existingTaxRate = await prisma.taxRate.findUnique({
      where: { id }
    });

    if (!existingTaxRate) {
      return res.status(404).json({
        success: false,
        error: 'Tax rate not found'
      });
    }

    // Validate required fields
    if (!name || rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and rate are required'
      });
    }

    // Validate rate is a number between 0 and 100
    if (typeof rate !== 'number' || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        error: 'Rate must be a number between 0 and 100'
      });
    }

    const updatedTaxRate = await prisma.taxRate.update({
      where: { id },
      data: {
        name: name.trim(),
        rate: parseFloat(rate.toFixed(2)), // Ensure 2 decimal places
        isActive: isActive ?? true,
        sortOrder: sortOrder || 1,
        description: description?.trim() || null,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      taxRate: updatedTaxRate
    });
  } catch (error) {
    console.error('Error updating tax rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tax rate'
    });
  }
});

// DELETE /api/settings/tax-rates/:id - Delete tax rate
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tax rate exists
    const existingTaxRate = await prisma.taxRate.findUnique({
      where: { id }
    });

    if (!existingTaxRate) {
      return res.status(404).json({
        success: false,
        error: 'Tax rate not found'
      });
    }

    await prisma.taxRate.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Tax rate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tax rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tax rate'
    });
  }
});

// GET /api/settings/tax-rates/active - Get only active tax rates for calculations
router.get('/active', async (req, res) => {
  try {
    const activeTaxRates = await prisma.taxRate.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    // Calculate total tax rate
    const totalRate = activeTaxRates.reduce((sum, tax) => sum + tax.rate, 0);

    res.json({
      success: true,
      taxRates: activeTaxRates,
      totalRate: parseFloat(totalRate.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching active tax rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active tax rates'
    });
  }
});

export default router;