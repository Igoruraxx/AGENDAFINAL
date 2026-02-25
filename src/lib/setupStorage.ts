import { supabase } from './supabase';

const BUCKETS = [
  { name: 'evolution-photos',    public: true },
  { name: 'bioimpedance-images', public: true },
];

let bucketsChecked = false;

/**
 * Garante que os buckets de storage existem.
 * Chamado automaticamente após o login do usuário.
 * Silencioso — erros não bloqueiam o fluxo do app.
 * Só executa uma vez por sessão do app.
 */
export async function ensureStorageBuckets(): Promise<void> {
  if (bucketsChecked) return;
  bucketsChecked = true;

  for (const bucket of BUCKETS) {
    try {
      const { error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
      });

      if (error) {
        // Expected: anon key can't create buckets (RLS), or bucket already exists
        const expected = error.message.includes('already exists')
          || error.message.includes('Duplicate')
          || error.message.includes('row-level security');
        if (!expected) {
          console.warn(`[Storage] Bucket "${bucket.name}":`, error.message);
        }
      }
    } catch {
      // Silencioso — pode falhar se anon key não tiver permissão (normal)
    }
  }
}
