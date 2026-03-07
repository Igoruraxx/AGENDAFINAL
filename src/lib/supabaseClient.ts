/**
 * Typed Supabase client.
 * Re-exports the singleton client from supabase.ts with full Database type
 * so callers get type-safe query builders automatically.
 */
export { supabase } from './supabase';
export type { Database } from '../types/database';
