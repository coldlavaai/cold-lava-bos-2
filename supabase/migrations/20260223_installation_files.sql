-- Installation Photos & Documents
-- Session: Jacob BOS Review Feb 2026
-- Photos and documents are stored in Supabase Storage and tracked in these tables.
-- Installations ARE jobs — installation_id = job_id throughout.

-- ============================================================
-- 1. Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'installation-files',
  'installation-files',
  false, -- Private: access via signed URLs only
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can read files from their own tenant
CREATE POLICY "Users can view installation files from their tenant"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'installation-files'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT tenant_id FROM auth.users WHERE id = auth.uid()
    )
  );

-- RLS: authenticated users can upload files to their own tenant
CREATE POLICY "Users can upload installation files to their tenant"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'installation-files'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT tenant_id FROM auth.users WHERE id = auth.uid()
    )
  );

-- RLS: authenticated users can delete files from their own tenant
CREATE POLICY "Users can delete installation files from their tenant"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'installation-files'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT tenant_id FROM auth.users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 2. installation_photos table
-- ============================================================
CREATE TABLE IF NOT EXISTS installation_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,         -- e.g. {tenant_id}/{job_id}/photos/{filename}
  file_name   TEXT NOT NULL,
  file_size   INTEGER,                -- bytes
  mime_type   TEXT,
  caption     TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE installation_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for installation_photos"
  ON installation_photos
  FOR ALL
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE INDEX idx_installation_photos_job_id ON installation_photos(job_id);
CREATE INDEX idx_installation_photos_tenant_id ON installation_photos(tenant_id);

-- ============================================================
-- 3. installation_documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS installation_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL CHECK (document_type IN (
                    'dno_approval',
                    'mcs_certificate',
                    'handover_pack',
                    'om_manual',
                    'other'
                  )),
  storage_path    TEXT NOT NULL,      -- e.g. {tenant_id}/{job_id}/documents/{filename}
  file_name       TEXT NOT NULL,
  file_size       INTEGER,            -- bytes
  mime_type       TEXT,
  notes           TEXT,
  uploaded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE installation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for installation_documents"
  ON installation_documents
  FOR ALL
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE INDEX idx_installation_documents_job_id ON installation_documents(job_id);
CREATE INDEX idx_installation_documents_tenant_id ON installation_documents(tenant_id);
