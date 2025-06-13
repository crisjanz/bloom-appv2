import express from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const upload = multer({ storage: multer.memoryStorage() });

// Upload order images
router.post('/upload-images', upload.array('images'), async (req, res) => {
  try {
    console.log('Image upload request received');
    let imageUrls: string[] = [];
    const files = (req as any).files as Express.Multer.File[];
    
    if (files && files.length > 0) {
      console.log(`Uploading ${files.length} files`);
      
      for (const file of files) {
        const filePath = `orders/${Date.now()}-${file.originalname}`;
        console.log('Uploading file to:', filePath);
        
        const { error } = await supabase.storage
          .from('product-images') // Using same bucket as products
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
          });
        
        if (error) {
          console.error('Supabase upload error:', error);
          throw error;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrls.push(publicUrlData.publicUrl);
        console.log('File uploaded successfully:', publicUrlData.publicUrl);
      }
    }

    console.log('All images uploaded:', imageUrls);

    res.json({
      success: true,
      imageUrls
    });

  } catch (error) {
    console.error('Error uploading order images:', error);
    res.status(500).json({
      error: 'Failed to upload images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;