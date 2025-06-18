import { Router } from 'express';
import { createBatch } from './batch';
import { activateCard } from './activate';
import { checkBalance } from './check';
import { redeemCard } from './redeem';
import { getGiftCards, getGiftCard } from './list';
import { purchaseCards } from './purchase';

const router = Router();

// Admin operations
router.post('/batch', createBatch);           // Generate batch of inactive cards
router.get('/', getGiftCards);               // List all cards (admin)
router.get('/:id', getGiftCard);             // Get single card details

// Card operations
router.post('/purchase', purchaseCards);     // Purchase/activate cards (handles both physical and digital)
router.post('/activate', activateCard);      // Legacy - activate card when sold
router.post('/check', checkBalance);         // Check card balance
router.post('/redeem', redeemCard);          // Use card for payment

export default router;