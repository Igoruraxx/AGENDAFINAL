import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_CONFIG_ERROR = 'Supabase não configurado';

const warnMissingEnv = () => {
  console.warn(
    '[Supabase] Variáveis de ambiente não configuradas. ' +
    'Defina REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY no arquivo .env.local'
  );
};

/**
 * Cliente mock para ambientes sem Supabase configurado (tests / storybook).
 * Evita crashes de runtime e retorna respostas vazias.
 */
function createMockSupabase(): SupabaseClient {
  warnMissingEnv();

  const resolved = <T>(data: T = [] as unknown as T) => {
    const payload = { data, error: null };
    const promise = Promise.resolve(payload);
    const builder: any = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      is: () => builder,
      match: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => Promise.resolve(payload),
      maybeSingle: () => Promise.resolve(payload),
      then: (...args: any[]) => promise.then(...args as any),
      catch: (...args: any[]) => promise.catch(...args as any),
      finally: (...args: any[]) => promise.finally(...args as any),
    };
    return builder;
  };

  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
      error: null,
    }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: SUPABASE_CONFIG_ERROR } as any }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: SUPABASE_CONFIG_ERROR } as any }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    signOut: async () => ({ error: null }),
  };

  const mockChannel = {
    on: () => mockChannel,
    subscribe: () => ({ unsubscribe: () => {} }),
  };

  return {
    auth: mockAuth as any,
    from: () => resolved(),
    storage: {
      createBucket: async () => ({ data: null, error: null }),
      from: () => ({
        upload: async () => ({ data: { path: '' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' }, error: null }),
      }),
    },
    channel: () => mockChannel as any,
    removeChannel: () => {},
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: 'fitpro-auth-token',
          storage: window.localStorage
        },
      }
    )
  : createMockSupabase();
