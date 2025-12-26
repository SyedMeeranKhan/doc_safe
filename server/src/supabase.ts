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
