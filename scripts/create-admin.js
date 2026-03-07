/**
 * Cria ou garante a conta administradora padrão
 *
 * Uso:
 * 1. Crie/complete o arquivo .env.local com:
 *    REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
 *    SUPABASE_SERVICE_KEY=eyJ... (chave service_role)
 *    ADMIN_EMAIL=semap.igor@gmail.com
 *    ADMIN_PASSWORD=Catarina.12
 *    ADMIN_NAME=Administrador (opcional)
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrador';
const USERS_PER_PAGE = 200; // evita trafegar grandes volumes desnecessários
const MAX_USER_PAGES = 100; // trava para impedir loops infinitos em paginação

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltam variáveis de ambiente REACT_APP_SUPABASE_URL ou SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '❌ Defina ADMIN_EMAIL e ADMIN_PASSWORD nas variáveis de ambiente antes de executar este script.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findUserByEmail(email) {
  let page = 1;

  while (page <= MAX_USER_PAGES) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });

    if (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }

    const found = data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;

    const returned = data?.users?.length ?? 0;
    if (returned < USERS_PER_PAGE) break;
    page += 1;
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
      user_metadata: { name: ADMIN_NAME },
    });

    if (error) {
      console.warn('⚠️ Falha ao criar usuário, verificando existência:', error.message);
      adminUser = await findUserByEmail(ADMIN_EMAIL);
      if (!adminUser) {
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
        name: adminUser.user_metadata?.name || ADMIN_NAME,
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
