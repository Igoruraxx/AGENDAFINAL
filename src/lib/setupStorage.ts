import { supabase } from './supabase';

const BUCKETS = [
  { name: 'evolution-photos',    public: false },
  { name: 'bioimpedance-images', public: false },
];

/**
 * Garante que os buckets de storage existem.
 * Chamado automaticamente após o login do usuário.
 * Silencioso — erros não bloqueiam o fluxo do app.
 */
export async function ensureStorageBuckets(): Promise<void> {
  try {
    // Primeiro, tenta listar para ver o que já existe
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    const existingNames = existingBuckets?.map(b => b.name) || [];

    for (const bucket of BUCKETS) {
      if (existingNames.includes(bucket.name)) continue;

      try {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 10 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
        });

        if (!error) {
          console.log(`[Storage] Bucket "${bucket.name}" criado com sucesso.`);
        }
      } catch (err) {
        // Silencioso
      }
    }
  } catch (err) {
    // Se não puder nem listar, provavelmente não tem permissão para criar também
  }
}
