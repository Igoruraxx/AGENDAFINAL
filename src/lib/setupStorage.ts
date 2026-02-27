import { supabase } from './supabase';

const BUCKETS = [
  { name: 'evolution-photos',    public: false },
  { name: 'bioimpedance-images', public: false },
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

  try {
    for (const bucket of BUCKETS) {
      try {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 10 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
        });

        if (error) {
          const exists = error.message.includes('already exists') || error.message.includes('Duplicate');
          if (!exists) {
            console.warn(`[Storage] Bucket "${bucket.name}":`, error.message);
          }
        }
      } catch (err) {
        // Silencioso
      }
    }
  } catch (err) {
    // Silencioso
  }
}
