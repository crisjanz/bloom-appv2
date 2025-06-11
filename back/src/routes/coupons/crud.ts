// src/routes/coupons/crud.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { CouponFormData } from '../../types/coupon';

const prisma = new PrismaClient();

// GET /api/coupons - List all coupons
export const getCoupons = async (req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usages: true }
        }
      }
    });

    return res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

// POST /api/coupons - Create new coupon
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const data: CouponFormData = req.body;

    // Validate required fields
    if (!data.code || !data.name || !data.discountType || data.value === undefined) {
      return res.status(400).json({
        error: 'Code, name, discount type, and value are required'
      });
    }

    // Check if code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() }
    });

    if (existingCoupon) {
      return res.status(400).json({
        error: 'A coupon with this code already exists'
      });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        value: data.value,
        usageLimit: data.usageLimit,
        perCustomerLimit: data.perCustomerLimit,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        minimumOrder: data.minimumOrder,
        applicableProducts: data.applicableProducts,
        applicableCategories: data.applicableCategories,
        posOnly: data.posOnly,
        webOnly: data.webOnly,
        enabled: data.enabled
      }
    });

    return res.status(201).json(coupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    return res.status(500).json({ error: 'Failed to create coupon' });
  }
};

// PUT /api/coupons/:id - Update coupon
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Partial<CouponFormData> = req.body;

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!existingCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // If updating code, check for duplicates
    if (data.code && data.code.toUpperCase() !== existingCoupon.code) {
      const codeExists = await prisma.coupon.findUnique({
        where: { code: data.code.toUpperCase() }
      });

      if (codeExists) {
        return res.status(400).json({
          error: 'A coupon with this code already exists'
        });
      }
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountType && { discountType: data.discountType }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
        ...(data.perCustomerLimit !== undefined && { perCustomerLimit: data.perCustomerLimit }),
        ...(data.startDate !== undefined && { 
          startDate: data.startDate ? new Date(data.startDate) : null 
        }),
        ...(data.endDate !== undefined && { 
          endDate: data.endDate ? new Date(data.endDate) : null 
        }),
        ...(data.minimumOrder !== undefined && { minimumOrder: data.minimumOrder }),
        ...(data.applicableProducts && { applicableProducts: data.applicableProducts }),
        ...(data.applicableCategories && { applicableCategories: data.applicableCategories }),
        ...(data.posOnly !== undefined && { posOnly: data.posOnly }),
        ...(data.webOnly !== undefined && { webOnly: data.webOnly }),
        ...(data.enabled !== undefined && { enabled: data.enabled })
      }
    });

    return res.json(updatedCoupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    return res.status(500).json({ error: 'Failed to update coupon' });
  }
};

// DELETE /api/coupons/:id - Delete coupon
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true, orders: true }
        }
      }
    });

    if (!existingCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check if coupon has been used
    if (existingCoupon._count.usages > 0 || existingCoupon._count.orders > 0) {
      return res.status(400).json({
        error: 'Cannot delete coupon that has been used. Consider disabling it instead.'
      });
    }

    await prisma.coupon.delete({
      where: { id }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({ error: 'Failed to delete coupon' });
  }
};