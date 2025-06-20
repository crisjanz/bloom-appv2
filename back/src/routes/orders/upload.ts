import express from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const upload = multer({ storage: multer.memoryStorage() });

// In-memory store for upload status (in production, use Redis or database)
const uploadStatus: Record<string, {
  status: 'uploading' | 'completed' | 'failed';
  imageUrls?: string[];
  error?: string;
  progress?: { current: number; total: number };
}> = {};

// Upload order images with immediate response
router.post('/upload-images', upload.array('images'), async (req, res) => {
  try {
    console.log('Image upload request received');
    const files = (req as any).files as Express.Multer.File[];
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!files || files.length === 0) {
      return res.json({
        success: true,
        imageUrls: [],
        uploadId
      });
    }

    console.log(`Starting background upload for ${files.length} files with ID: ${uploadId}`);
    
    // Initialize upload status
    uploadStatus[uploadId] = {
      status: 'uploading',
      progress: { current: 0, total: files.length }
    };
    
    // Generate temporary placeholders for immediate response
    const tempUrls = files.map((file, index) => ({
      originalName: file.originalname,
      tempId: `${uploadId}-${index}`,
      status: 'uploading'
    }));

    // Respond immediately to user
    res.json({
      success: true,
      uploadId,
      imageUrls: [], // Empty for now, will be updated via callback/polling
      tempFiles: tempUrls,
      message: `Upload started for ${files.length} files`
    });

    // Upload files in background (non-blocking)
    uploadFilesToSupabase(files, uploadId)
      .then((imageUrls) => {
        console.log(`✅ Background upload completed for ${uploadId}:`, imageUrls);
        uploadStatus[uploadId] = {
          status: 'completed',
          imageUrls,
          progress: { current: files.length, total: files.length }
        };
      })
      .catch((error) => {
        console.error(`❌ Background upload failed for ${uploadId}:`, error);
        uploadStatus[uploadId] = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: { current: 0, total: files.length }
        };
      });

  } catch (error) {
    console.error('Error starting image upload:', error);
    res.status(500).json({
      error: 'Failed to start image upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check upload status endpoint
router.get('/upload-status/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const status = uploadStatus[uploadId];
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Upload ID not found'
    });
  }
  
  res.json({
    success: true,
    ...status
  });
});

// Background upload function
async function uploadFilesToSupabase(files: Express.Multer.File[], uploadId: string): Promise<string[]> {
  const imageUrls: string[] = [];
  
  console.log(`📤 Starting background upload for ${files.length} files (${uploadId})`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = `orders/${Date.now()}-${i}-${file.originalname}`;
    
    console.log(`📤 Uploading file ${i + 1}/${files.length}: ${filePath}`);
    
    // Update progress
    if (uploadStatus[uploadId]) {
      uploadStatus[uploadId].progress = { current: i, total: files.length };
    }
    
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });
    
    if (error) {
      console.error(`❌ Supabase upload error for file ${i + 1}:`, error);
      throw error;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    imageUrls.push(publicUrlData.publicUrl);
    console.log(`✅ File ${i + 1}/${files.length} uploaded: ${publicUrlData.publicUrl}`);
  }
  
  console.log(`✅ All ${files.length} files uploaded successfully for ${uploadId}`);
  return imageUrls;
}

export default router;