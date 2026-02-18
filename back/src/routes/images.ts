import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { uploadToR2, deleteFromR2 } from '../utils/r2Client';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

/**
 * Upload image to R2
 * POST /api/images/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'general';
    const { key, url } = await uploadToR2({
      folder,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });

    res.json({
      success: true,
      url,
      key,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Delete image from R2
 * DELETE /api/images/delete
 */
router.delete('/delete', async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ message: 'No image key provided' });
    }

    await deleteFromR2(key);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Proxy remote image for same-origin canvas use
 * GET /api/images/proxy?url=https://...
 */
router.get('/proxy', async (req, res) => {
  try {
    const sourceUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!sourceUrl) {
      return res.status(400).json({ success: false, message: 'Missing url query parameter' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid URL' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, message: 'Only http/https URLs are allowed' });
    }

    const response = await axios.get<ArrayBuffer>(parsedUrl.toString(), {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'BloomImageProxy/1.0'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=120');
    return res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(502).json({
      success: false,
      message: 'Failed to fetch remote image'
    });
  }
});

export default router;
