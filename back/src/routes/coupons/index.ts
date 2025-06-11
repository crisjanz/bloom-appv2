// src/routes/coupons/index.ts
import { Router } from 'express';
import { validateCoupon } from './validate';
import { applyCoupon } from './apply';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from './crud';

const router = Router();

// Validation and application
router.post('/validate', validateCoupon);
router.post('/apply', applyCoupon);

// CRUD operations
router.get('/', getCoupons);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;