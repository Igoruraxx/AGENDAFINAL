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

-- ════════════════════════════════════════════════════
-- 4. PORTAL PÚBLICO DE EVOLUÇÃO POR ALUNO
-- Cole este bloco JUNTO com o anterior no SQL Editor
-- ════════════════════════════════════════════════════

-- Coluna share_token em students (UUID único por aluno)
ALTER TABLE students ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS students_share_token_idx ON students (share_token) WHERE share_token IS NOT NULL;

-- Garante que todos os alunos existentes tenham token
UPDATE students SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- RLS: anon pode ler alunos via share_token
DROP POLICY IF EXISTS "anon_read_students_by_token" ON students;
CREATE POLICY "anon_read_students_by_token" ON students
  FOR SELECT TO anon USING (share_token IS NOT NULL);

-- RLS: anon pode ler evolution_photos
DROP POLICY IF EXISTS "anon_read_evolution_photos" ON evolution_photos;
CREATE POLICY "anon_read_evolution_photos" ON evolution_photos
  FOR SELECT TO anon USING (true);

-- RLS: anon pode ler bioimpedance
DROP POLICY IF EXISTS "anon_read_bioimpedance" ON bioimpedance;
CREATE POLICY "anon_read_bioimpedance" ON bioimpedance
  FOR SELECT TO anon USING (true);

-- RLS: anon pode ler measurements
DROP POLICY IF EXISTS "anon_read_measurements" ON measurements;
CREATE POLICY "anon_read_measurements" ON measurements
  FOR SELECT TO anon USING (true);
