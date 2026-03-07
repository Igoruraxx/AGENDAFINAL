/**
 * Cria ou garante a conta administradora padrão
 *
 * Uso:
 * 1. Crie/complete o arquivo .env.local com:
 *    REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
 *    SUPABASE_SERVICE_KEY=eyJ... (chave service_role)
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

const ADMIN_EMAIL = 'semap.igor@gmail.com';
const ADMIN_PASSWORD = 'Catarina.12';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltam variáveis de ambiente REACT_APP_SUPABASE_URL ou SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function ensureAdminAccount() {
  console.log('🔍 Verificando conta administradora padrão...');

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Erro ao listar usuários: ${listError.message}`);
  }

  let adminUser = usersData?.users?.find(
    (user) => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  if (!adminUser) {
    console.log('👤 Criando usuário administrador...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Administrador' },
    });

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    adminUser = data.user;
  } else {
    console.log('✅ Usuário administrador já existe.');
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
