import express from 'express';
import listRoutes from './list';
import createRoutes from './create';
import updateRoutes from './update';
import uploadRoutes from './upload';
import singleRoutes from './single';
import statusRoutes from './status';
import deliveryRoutes from './delivery';

const router = express.Router();

console.log('Setting up order routes...');

// Mount all sub-routes
router.use('/', listRoutes);
router.use('/', createRoutes);
router.use('/', updateRoutes);
router.use('/', uploadRoutes);
router.use('/', singleRoutes);
router.use('/', statusRoutes);
router.use('/', deliveryRoutes);

console.log('Order routes configured successfully');

export default router;