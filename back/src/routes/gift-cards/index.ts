import { Router } from 'express';
import { createBatch } from './batch';
import { activateCard } from './activate';
import { checkBalance } from './check';
import { redeemCard } from './redeem';
import { getGiftCards, getGiftCard } from './list';
import { purchaseCards } from './purchase';
import { deactivateCard } from './deactivate';
import { adjustBalance } from './adjust';
import { resendGiftCardEmail } from './resend';
import { generateGiftCardNumber } from './generate-number';

const router = Router();

// Admin operations
router.post('/batch', createBatch);           // Generate batch of inactive cards
router.post('/generate-number', generateGiftCardNumber); // Generate electronic card number
router.get('/', getGiftCards);               // List all cards (admin)
router.patch('/:id/deactivate', deactivateCard); // Deactivate a card
router.post('/:id/adjust', adjustBalance);       // Adjust card balance
router.post('/:id/resend', resendGiftCardEmail); // Resend digital GC email to recipient
router.get('/:id', getGiftCard);             // Get single card details

// Card operations
router.post('/purchase', purchaseCards);     // Purchase/activate cards (handles both physical and digital)
router.post('/activate', activateCard);      // Legacy - activate card when sold
router.post('/check', checkBalance);         // Check card balance
router.post('/redeem', redeemCard);          // Use card for payment

export default router;
