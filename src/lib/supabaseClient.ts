import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Variáveis de ambiente não configuradas. ' +
    'Defina REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY no arquivo .env.local'
  );
}

/**
 * Type-safe Supabase client using the Database schema.
 * Use this client when you need full TypeScript inference on queries.
 * For auth-related operations use the default `supabase` client from `../lib/supabase`.
 */
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'fitpro-auth-token',
      storage: window.localStorage,
    },
  }
);

export type { Database };
