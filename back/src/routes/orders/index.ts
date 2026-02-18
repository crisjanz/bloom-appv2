import express from 'express';
import listRoutes from './list';
import createRoutes from './create';
import updateRoutes from './update';
import uploadRoutes from './upload';
import imageRoutes from './images';
import singleRoutes from './single';
import statusRoutes from './status';
import deliveryRoutes from './delivery';
import scanRoutes from './scan';
import createFromScanRoutes from './create-from-scan';

const router = express.Router();

console.log('Setting up order routes...');

// Mount all sub-routes
// IMPORTANT: deliveryRoutes must come BEFORE singleRoutes
// because /:id in singleRoutes would match /delivery
router.use('/', listRoutes);
router.use('/', createRoutes);
router.use('/', createFromScanRoutes);  // Create order from scanned data
router.use('/', updateRoutes);
router.use('/', uploadRoutes);
router.use('/', imageRoutes);
router.use('/scan', scanRoutes);  // OCR scanning endpoint
router.use('/', deliveryRoutes);  // Must be before singleRoutes!
router.use('/', statusRoutes);
router.use('/', singleRoutes);    // /:id route - must be last

console.log('Order routes configured successfully');

export default router;
