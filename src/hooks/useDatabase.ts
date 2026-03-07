import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type TableName =
  | 'profiles'
  | 'students'
  | 'appointments'
  | 'evolution_photos'
  | 'bioimpedance'
  | 'measurements'
  | 'payments';

interface UseDatabaseOptions<T> {
  table: TableName;
  /** Column used to filter rows belonging to the current user. Defaults to 'user_id'. */
  userColumn?: string;
  /** Static filters applied on every fetch, e.g. { student_id: 'xxx' } */
  filters?: Record<string, unknown>;
  /** Order configuration */
  orderBy?: { column: string; ascending?: boolean };
  /** Whether to fetch automatically on mount. Defaults to true. */
  autoFetch?: boolean;
  /** Map a raw DB row to the desired shape. */
  mapRow?: (row: Record<string, unknown>) => T;
}

interface UseDatabaseResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  insert: (payload: Record<string, unknown>) => Promise<T>;
  update: (id: string, payload: Record<string, unknown>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Generic CRUD hook for any Supabase table.
 * Handles loading state, error state, and basic CRUD operations.
 *
 * @example
 * const { data, loading, insert, update, remove } = useDatabase<Payment>({
 *   table: 'payments',
 *   filters: { month_ref: '2024-01' },
 *   orderBy: { column: 'due_date' },
 * });
 */
export function useDatabase<T = Record<string, unknown>>(
  options: UseDatabaseOptions<T>
): UseDatabaseResult<T> {
  const {
    table,
    userColumn = 'user_id',
    filters = {},
    orderBy,
    autoFetch = true,
    mapRow,
  } = options;

  const { currentUser, isAuthenticated } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from(table)
      .select('*')
      .eq(userColumn, currentUser.id);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data: rows, error: err } = await query;

    if (err) {
      setError(err.message);
      console.error(`[useDatabase:${table}]`, err.message);
    } else {
      const mapped = (rows || []).map(row =>
        mapRow ? mapRow(row as Record<string, unknown>) : row as unknown as T
      );
      setData(mapped);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, isAuthenticated, table, userColumn, JSON.stringify(filters), orderBy?.column, orderBy?.ascending]);

  useEffect(() => {
    if (autoFetch) fetch();
  }, [autoFetch, fetch]);

  const insert = useCallback(async (payload: Record<string, unknown>): Promise<T> => {
    if (!currentUser.id) throw new Error('Usuário não autenticado');

    const { data: row, error: err } = await supabase
      .from(table)
      .insert({ ...payload, [userColumn]: currentUser.id })
      .select()
      .single();

    if (err) throw new Error(err.message);

    const item = mapRow
      ? mapRow(row as Record<string, unknown>)
      : row as unknown as T;

    setData(prev => [...prev, item]);
    return item;
  }, [currentUser.id, mapRow, table, userColumn]);

  const update = useCallback(async (id: string, payload: Record<string, unknown>): Promise<void> => {
    const { error: err } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id);

    if (err) throw new Error(err.message);
    await fetch();
  }, [fetch, table]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (err) throw new Error(err.message);
    setData(prev => prev.filter((item: any) => item.id !== id));
  }, [table]);

  return { data, loading, error, fetch, insert, update, remove };
}
