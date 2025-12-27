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

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 12000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input as any, {
      ...init,
      signal: init?.signal ?? controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

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
  return createClient(url, key, {
    ...options,
    global: {
      ...(options?.global ?? {}),
      fetch: fetchWithTimeout
    }
  });
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
