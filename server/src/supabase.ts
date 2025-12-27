import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ CRITICAL ERROR: Missing Supabase credentials in environment variables.');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY');
  // We do not exit here to allow the server to start and log the error, 
  // but functionality will be broken.
}

// Helper to create a safe client or a dummy one if credentials fail
const createSafeClient = (url: string | undefined, key: string | undefined, options: any): SupabaseClient => {
  if (!url || !key) {
    // Return a dummy client that throws intelligible errors when used
    return {
      from: () => ({ select: () => ({ data: null, error: { message: 'Supabase not configured' } }) }),
      storage: { listBuckets: () => ({ data: null, error: { message: 'Supabase not configured' } }) },
      auth: { getUser: () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }) }
    } as unknown as SupabaseClient;
  }
  return createClient(url, key, options);
};

// 1. Client for verifying user tokens (Anon Key)
export const supabaseVerify = createSafeClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 2. Client for database & storage access (Service Role Key)
export const supabaseAdmin = createSafeClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Diagnostic check on startup
(async () => {
  if (!supabaseUrl || !supabaseServiceKey) return;
  
  try {
    console.log('🔄 Verifying Supabase Service Role connection...');
    const { error } = await supabaseAdmin.from('files').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Service Role Access Failed:', error.message);
    } else {
      console.log('✅ Service Role Access Confirmed');
    }
  } catch (err) {
    console.error('❌ Unexpected error during Supabase connection check:', err);
  }
})();
