import express, { Response } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../supabase';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Multer setup for memory storage (we upload directly to Supabase from memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload File
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    const user = req.user;

    if (!file || !user) {
      return res.status(400).json({ error: 'No file provided or user not authenticated' });
    }

    // 1. Generate unique path
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
    
    // 2. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabaseAdmin
      .storage
      .from('user-uploads') // Bucket name
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (storageError) {
      console.error('Storage Upload Error:', JSON.stringify(storageError, null, 2));
      return res.status(500).json({ error: 'Failed to upload file to storage', details: storageError.message });
    }

    // 3. Insert Metadata into Database
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('files')
      .insert({
        storage_path: storageData.path,
        original_filename: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        owner_id: user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database Insert Error:', JSON.stringify(dbError, null, 2));
      // Cleanup: Attempt to delete the uploaded file if DB insert fails
      await supabaseAdmin.storage.from('user-uploads').remove([fileName]);
      return res.status(500).json({ error: 'Failed to save file metadata', details: dbError.message });
    }

    res.status(201).json({ message: 'File uploaded successfully', file: dbData });

  } catch (err) {
    console.error('Upload Endpoint Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List Files
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database List Error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to retrieve files', details: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('List Endpoint Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete File
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Get file metadata to find storage path
    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 2. Delete from Storage
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('user-uploads')
      .remove([fileRecord.storage_path]);

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue to delete from DB anyway to keep state clean? Or fail?
      // Usually better to ensure DB consistency.
    }

    // 3. Delete from DB
    const { error: dbError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (dbError) {
      return res.status(500).json({ error: 'Failed to delete file record' });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Download File
router.get('/:id/download', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Verify ownership and get storage path
    const { data: fileRecord, error: fetchError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 2. Generate Signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from('user-uploads')
      .createSignedUrl(fileRecord.storage_path, 60 * 60); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
        console.error('Signed URL Error:', signedUrlError);
        return res.status(500).json({ error: 'Failed to generate download link' });
    }

    // 3. Return the URL
    res.json({ downloadUrl: signedUrlData.signedUrl });

  } catch (err) {
    console.error('Download Endpoint Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
