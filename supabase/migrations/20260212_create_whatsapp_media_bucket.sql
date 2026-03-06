-- Create storage bucket for WhatsApp media (images, audio, video)
-- This bucket stores media attachments received via Twilio WhatsApp webhook

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true, -- Public bucket so media URLs work in frontend
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/amr',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policy for the bucket
-- Allow authenticated users to read media from their own tenant
CREATE POLICY "Users can view media from their tenant"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT tenant_id FROM auth.users WHERE id = auth.uid()
    )
  );

-- Allow the service role (used by webhook) to insert media
CREATE POLICY "Service role can upload media"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow service role to delete media (for cleanup)
CREATE POLICY "Service role can delete media"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'whatsapp-media');
