import express from 'express';
import multer from 'multer';
import { uploadToR2 } from '../../utils/r2Client';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-images', upload.array('images'), async (req, res) => {
  try {
    const files = (req as any).files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.json({ success: true, imageUrls: [] });
    }

    console.log(`📤 Uploading ${files.length} order image(s) to Cloudflare R2...`);

    const uploads = await Promise.all(files.map((file) =>
      uploadToR2({
        folder: 'orders',
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      })
    ));

    const imageUrls = uploads.map(({ url }) => url);

    console.log(`✅ Order images uploaded: ${imageUrls.length}`);

    res.json({
      success: true,
      imageUrls,
    });
  } catch (error) {
    console.error('Error uploading order images:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload images',
    });
  }
});

export default router;
