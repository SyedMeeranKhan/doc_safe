-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create 'files' table
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create Policy: Users can only see their own files
CREATE POLICY "Users can view own files" ON public.files
  FOR SELECT USING (auth.uid() = owner_id);

-- Create Policy: Users can insert their own files
CREATE POLICY "Users can insert own files" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Create Policy: Users can delete their own files
CREATE POLICY "Users can delete own files" ON public.files
  FOR DELETE USING (auth.uid() = owner_id);

-- Storage Bucket Policy (You need to create a bucket named 'user-uploads' in Supabase Dashboard)
-- Policy for Storage Objects (SQL for Storage Policies is complex to apply directly via SQL editor usually, but here is the logic)
-- Allow authenticated uploads to 'user-uploads' bucket
-- Allow authenticated downloads from 'user-uploads' bucket if owner
