import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { normalizeProductCode } from '../utils/wireProductExtractor';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Fetch image from external URL (petals.ca, etc.)
 * GET /api/wire-products/fetch-image?url=https://petals.ca/ch77aa-s
 */
router.get('/fetch-image', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    // Ensure HTTPS
    const fetchUrl = url.startsWith('http') ? url : `https://${url}`;

    console.log(`🔍 Fetching image from: ${fetchUrl}`);

    // Fetch the page HTML
    const response = await axios.get(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);

    // Strategy: Look for product images in common locations
    const imageSelectors = [
      'meta[property="og:image"]',          // Open Graph image (most reliable)
      'meta[name="twitter:image"]',         // Twitter card image
      '.product-image img',                 // Common class name
      '#product-image img',                 // Common ID
      'img[itemprop="image"]',              // Schema.org markup
      '.gallery img:first',                 // Gallery first image
      'main img:first',                     // First image in main content
      'article img:first',                  // First image in article
      'img[src*="product"]',                // Image with "product" in URL
      'img:first'                           // Fallback to first image
    ];

    let imageUrl: string | null = null;

    for (const selector of imageSelectors) {
      const element = $(selector).first();

      if (element.length) {
        // Get image URL from different possible attributes
        imageUrl = element.attr('content') || // meta tags use content
                   element.attr('src') ||      // img tags use src
                   element.attr('data-src');   // lazy-loaded images

        if (imageUrl) {
          // Convert relative URLs to absolute
          if (imageUrl.startsWith('/')) {
            const urlObj = new URL(fetchUrl);
            imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
          } else if (imageUrl.startsWith('//')) {
            imageUrl = `https:${imageUrl}`;
          }

          console.log(`✅ Found image: ${imageUrl} (using selector: ${selector})`);
          break;
        }
      }
    }

    if (!imageUrl) {
      return res.status(404).json({
        error: 'No product image found on page',
        suggestion: 'Try uploading the image manually'
      });
    }

    res.json({
      success: true,
      imageUrl,
      sourceUrl: fetchUrl,
      message: 'Image found! Review and save if correct.'
    });

  } catch (error: any) {
    console.error('Error fetching image:', error);
    res.status(500).json({
      error: 'Failed to fetch image from URL',
      details: error.message
    });
  }
});

/**
 * Get all wire products from library
 * GET /api/wire-products
 */
router.get('/', async (req, res) => {
  try {
    const { search, source } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { productCode: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (source && typeof source === 'string') {
      where.source = source;
    }

    const products = await prisma.wireProductLibrary.findMany({
      where,
      orderBy: [
        { timesUsed: 'desc' },  // Most used first
        { lastUsedAt: 'desc' }
      ],
      take: 100
    });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching wire products:', error);
    res.status(500).json({ error: 'Failed to fetch wire products' });
  }
});

/**
 * Get single wire product by code
 * GET /api/wire-products/:code
 */
router.get('/:code', async (req, res) => {
  try {
    const normalizedCode = normalizeProductCode(req.params.code);

    const product = await prisma.wireProductLibrary.findUnique({
      where: { productCode: normalizedCode }
    });

    if (!product) {
      return res.status(404).json({ error: 'Wire product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching wire product:', error);
    res.status(500).json({ error: 'Failed to fetch wire product' });
  }
});

/**
 * Update wire product (add/change image, description, etc.)
 * PATCH /api/wire-products/:code
 */
router.patch('/:code', async (req, res) => {
  try {
    const normalizedCode = normalizeProductCode(req.params.code);
    const { imageUrl, productName, description, source, externalUrl } = req.body;

    const updated = await prisma.wireProductLibrary.update({
      where: { productCode: normalizedCode },
      data: {
        ...(imageUrl !== undefined && { imageUrl }),
        ...(productName !== undefined && { productName }),
        ...(description !== undefined && { description }),
        ...(source !== undefined && { source }),
        ...(externalUrl !== undefined && { externalUrl })
      }
    });

    res.json({ success: true, product: updated });
  } catch (error) {
    console.error('Error updating wire product:', error);
    res.status(500).json({ error: 'Failed to update wire product' });
  }
});

export default router;
