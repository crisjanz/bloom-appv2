// src/routes/coupons/apply.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ApplyRequest {
  couponId: string;
  orderId: string;
  customerId?: string;
  employeeId?: string;
  source: 'POS' | 'WEBSITE';
}

export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { couponId, orderId, customerId, employeeId, source }: ApplyRequest = req.body;

    // Validate required fields
    if (!couponId || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Coupon ID and Order ID are required'
      });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update coupon usage count
      const updatedCoupon = await tx.coupon.update({
        where: { id: couponId },
        data: {
          usageCount: {
            increment: 1
          }
        }
      });

      // Create usage record
      const usage = await tx.couponUsage.create({
        data: {
          couponId,
          customerId,
          orderId,
          employeeId,
          source
        }
      });

      // Update order with coupon reference
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          couponId,
          couponCode: updatedCoupon.code
        }
      });

      return { updatedCoupon, usage, updatedOrder };
    });

    return res.json({
      success: true,
      usage: result.usage
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply coupon'
    });
  }
};