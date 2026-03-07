/**
 * Cria ou garante a conta administradora padrão
 *
 * Uso:
 * 1. Crie/complete o arquivo .env.local com:
 *    REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
 *    SUPABASE_SERVICE_KEY=eyJ... (chave service_role)
 *    ADMIN_EMAIL=semap.igor@gmail.com
 *    ADMIN_PASSWORD=Catarina.12
 *
 * 2. Execute: node scripts/create-admin.js
 */

try {
  // Carrega variáveis do .env.local se o pacote estiver disponível
  // (é seguro ignorar se não estiver instalado)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: '.env.local' });
} catch (_) {
  // segue apenas com variáveis já definidas no ambiente
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'semap.igor@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Catarina.12';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltam variáveis de ambiente REACT_APP_SUPABASE_URL ou SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Defina ADMIN_EMAIL e ADMIN_PASSWORD (ou use os valores padrão exigidos).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findUserByEmail(email) {
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }

    const found = data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;

    if (!data?.nextPage || data.nextPage <= page) break;
    page = data.nextPage;
  }

  return null;
}

async function ensureAdminAccount() {
  console.log('🔍 Verificando conta administradora padrão...');

  let adminUser = await findUserByEmail(ADMIN_EMAIL);

  if (!adminUser) {
    console.log('👤 Criando usuário administrador...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Administrador' },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        adminUser = await findUserByEmail(ADMIN_EMAIL);
      } else {
        throw new Error(`Erro ao criar usuário: ${error.message}`);
      }
    } else {
      adminUser = data.user;
    }
  } else {
    console.log('✅ Usuário administrador já existe.');
  }

  if (!adminUser) {
    throw new Error('Não foi possível localizar ou criar o usuário administrador.');
  }

  console.log('🔐 Garantindo perfil com permissão de administrador...');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: adminUser.id,
        name: adminUser.user_metadata?.name || 'Administrador',
        email: ADMIN_EMAIL,
        is_admin: true,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
  }

  console.log('🎉 Conta administradora pronta para uso!');
}

ensureAdminAccount().catch((error) => {
  console.error('❌ Falha ao configurar a conta administradora:', error.message || error);
  process.exit(1);
});
