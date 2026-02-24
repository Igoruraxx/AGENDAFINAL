import { supabase } from './supabase';

const BUCKETS = [
  { name: 'evolution-photos',    public: true },
  { name: 'bioimpedance-images', public: true },
];

/**
 * Garante que os buckets de storage existem.
 * Chamado automaticamente após o login do usuário.
 * Silencioso — erros não bloqueiam o fluxo do app.
 */
export async function ensureStorageBuckets(): Promise<void> {
  for (const bucket of BUCKETS) {
    try {
      // Tenta criar; se já existir, retorna código de duplicata (não é erro crítico)
      const { error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
      });

      if (error && !error.message.includes('already exists') && !error.message.includes('Duplicate')) {
        console.warn(`[Storage] Não foi possível criar bucket "${bucket.name}":`, error.message);
      } else if (!error) {
        console.log(`[Storage] Bucket "${bucket.name}" criado com sucesso.`);
      }
    } catch {
      // Silencioso — pode falhar se anon key não tiver permissão (normal)
    }
  }
}
