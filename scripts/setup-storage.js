/**
 * Script de setup do Supabase Storage
 * Cria os buckets necessários para o app funcionar
 *
 * Como usar:
 * 1. Crie um arquivo .env.local com:
 *    REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
 *    REACT_APP_SUPABASE_ANON_KEY=eyJ...
 *    SUPABASE_SERVICE_KEY=eyJ...  (encontre em: Settings > API > service_role)
 *
 * 2. Execute:  node scripts/setup-storage.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltam variáveis de ambiente.');
  console.error('   Adicione ao .env.local:');
  console.error('   REACT_APP_SUPABASE_URL=https://xxxx.supabase.co');
  console.error('   SUPABASE_SERVICE_KEY=eyJ...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const BUCKETS = [
  { name: 'evolution-photos',     public: true },
  { name: 'bioimpedance-images',  public: true },
];

async function setupBuckets() {
  console.log('🚀 Configurando Storage do Supabase...\n');

  for (const bucket of BUCKETS) {
    // Verificar se o bucket já existe
    const { data: existing } = await supabase.storage.getBucket(bucket.name);

    if (existing) {
      // Bucket já existe — garantir que é público
      const { error } = await supabase.storage.updateBucket(bucket.name, { public: bucket.public });
      if (error) {
        console.error(`❌ Erro ao atualizar bucket "${bucket.name}":`, error.message);
      } else {
        console.log(`✅ Bucket "${bucket.name}" já existe e está público.`);
      }
    } else {
      // Criar novo bucket
      const { error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
      });

      if (error) {
        console.error(`❌ Erro ao criar bucket "${bucket.name}":`, error.message);
      } else {
        console.log(`✅ Bucket "${bucket.name}" criado com sucesso!`);
      }
    }
  }

  console.log('\n✨ Setup concluído!');
}

setupBuckets().catch(console.error);
