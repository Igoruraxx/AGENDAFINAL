-- =======================================================
-- SETUP DE STORAGE DO SUPABASE
-- Cole e execute este SQL no Supabase > SQL Editor
-- =======================================================

-- 1. Criar os buckets (ignora se já existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evolution-photos',
  'evolution-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bioimpedance-images',
  'bioimpedance-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de acesso para evolution-photos
DROP POLICY IF EXISTS "ev_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "ev_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "ev_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "ev_photos_delete" ON storage.objects;

CREATE POLICY "ev_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evolution-photos');

CREATE POLICY "ev_photos_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'evolution-photos');

CREATE POLICY "ev_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'evolution-photos');

CREATE POLICY "ev_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evolution-photos');

-- 3. Políticas de acesso para bioimpedance-images
DROP POLICY IF EXISTS "bio_img_insert" ON storage.objects;
DROP POLICY IF EXISTS "bio_img_select" ON storage.objects;
DROP POLICY IF EXISTS "bio_img_update" ON storage.objects;
DROP POLICY IF EXISTS "bio_img_delete" ON storage.objects;

CREATE POLICY "bio_img_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bioimpedance-images');

CREATE POLICY "bio_img_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'bioimpedance-images');

CREATE POLICY "bio_img_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'bioimpedance-images');

CREATE POLICY "bio_img_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bioimpedance-images');
