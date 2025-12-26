import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials in .env file');
}

// 1. Client for verifying user tokens (Anon Key)
// This client has limited permissions and is used only for auth validation
export const supabaseVerify = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 2. Client for database & storage access (Service Role Key)
// This client has admin privileges and bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Diagnostic check on startup
(async () => {
  try {
    console.log('🔄 Verifying Supabase Service Role connection...');
    const { data, error } = await supabaseAdmin.from('files').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Service Role Access Failed:', error.message);
      console.error('   Hint: Ensure SUPABASE_SERVICE_KEY is actually the Service Role Key (not Anon Key).');
    } else {
      console.log('✅ Service Role Access Confirmed (Database connection successful)');
    }

    // Check Storage Bucket
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Storage Access Failed:', bucketError.message);
    } else {
      const bucketExists = buckets.find(b => b.name === 'user-uploads');
      if (!bucketExists) {
        console.warn('⚠️  Warning: "user-uploads" bucket not found. File uploads will fail.');
      } else {
        console.log('✅ Storage Bucket "user-uploads" found.');
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error during Supabase connection check:', err);
  }
})();
