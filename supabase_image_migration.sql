-- ============================================================
--  Doctorji — Image Sharing Migration
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add image_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies — authenticated users can upload
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
  );

-- 4. Anyone can view chat images (public bucket)
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

-- 5. Users can delete their own uploaded images
DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;
CREATE POLICY "Users can delete own chat images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
  );
