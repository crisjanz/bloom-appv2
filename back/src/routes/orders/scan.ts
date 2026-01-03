import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { parseOrderImage } from '../../services/gemini-ocr';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  },
});

/**
 * Validate address exists in Google Maps
 */
async function validateAddress(address: any) {
  try {
    console.log('🔍 Validating address:', address.address1);
    const shopProfile = await prisma.shopProfile.findFirst();
    if (!shopProfile?.googleMapsApiKey) {
      console.log('⚠️ Google Maps API key not found in ShopProfile');
      return { valid: false };
    }

    const searchQuery = `${address.address1}, ${address.city}, ${address.province} ${address.postalCode}, ${address.country}`;
    console.log('📍 Looking up address:', searchQuery);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${shopProfile.googleMapsApiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();
    console.log('📍 Geocoding API response status:', data.status);

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const components = result.address_components;

      // Check if we got a valid street address (not just postal code)
      const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
      const route = components.find((c: any) => c.types.includes('route'))?.long_name || '';

      if (streetNumber && route) {
        // Verify the street number matches
        const scannedStreetNumber = address.address1.match(/^\d+/)?.[0];
        if (scannedStreetNumber && streetNumber === scannedStreetNumber) {
          console.log('✅ Address validated');
          return { valid: true };
        }
      }

      console.log('⚠️ Address not found or invalid');
      return { valid: false };
    }

    console.log('⚠️ Address not found');
    return { valid: false };
  } catch (error) {
    console.error('Address validation error:', error);
    return { valid: false };
  }
}

/**
 * POST /api/orders/scan
 * Upload an FTD order image/PDF and extract structured data
 */
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('📸 Scanning order image:', req.file.originalname);

    // Parse the image using Gemini
    const orderData = await parseOrderImage(req.file.buffer);

    console.log('✅ Order parsed successfully:', orderData.orderNumber);

    // Validate address
    const addressValidation = await validateAddress(orderData.address);

    return res.json({
      success: true,
      data: orderData,
      addressValid: addressValidation.valid,
    });
  } catch (error) {
    console.error('❌ Scan error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan order',
    });
  }
});

export default router;
