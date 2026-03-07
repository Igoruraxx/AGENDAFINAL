import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type TableName = keyof Database['public']['Tables'];

type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
type InsertRow<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type UpdateRow<T extends TableName> = Database['public']['Tables'][T]['Update'];

export interface QueryOptions {
  /** Comma-separated column list passed to .select() */
  select?: string;
  /** Filter: { column: value } pairs applied as .eq() */
  filters?: Record<string, string | number | boolean | null>;
  /** Column to order by */
  orderBy?: string;
  /** Order direction, defaults to 'asc' */
  orderDir?: 'asc' | 'desc';
  /** Max number of rows to return */
  limit?: number;
}

/**
 * Generic database hook providing typed CRUD helpers for any table.
 * Use the table-specific hooks (useStudents, useEvents, etc.) for
 * reactive state and realtime subscriptions; use this hook for
 * one-off or administrative operations.
 */
export function useDatabase() {
  const fetchRows = useCallback(async <T extends TableName>(
    table: T,
    options: QueryOptions = {},
  ): Promise<Row<T>[]> => {
    let query = supabase
      .from(table)
      .select(options.select ?? '*') as any;

    if (options.filters) {
      for (const [col, val] of Object.entries(options.filters)) {
        if (val === null) {
          query = query.is(col, null);
        } else {
          query = query.eq(col, val);
        }
      }
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir !== 'desc' });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[useDatabase] fetchRows(${table}):`, error.message);
      throw new Error(error.message);
    }

    return (data ?? []) as Row<T>[];
  }, []);

  const fetchRow = useCallback(async <T extends TableName>(
    table: T,
    id: string,
    select = '*',
  ): Promise<Row<T> | null> => {
    const { data, error } = await (supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .single() as any);

    if (error) {
      if (error.code === 'PGRST116') return null; // no rows
      console.error(`[useDatabase] fetchRow(${table}, ${id}):`, error.message);
      throw new Error(error.message);
    }

    return data as Row<T>;
  }, []);

  const insertRow = useCallback(async <T extends TableName>(
    table: T,
    row: InsertRow<T>,
  ): Promise<Row<T>> => {
    const { data, error } = await (supabase
      .from(table)
      .insert(row as any)
      .select()
      .single() as any);

    if (error) {
      console.error(`[useDatabase] insertRow(${table}):`, error.message);
      throw new Error(error.message);
    }

    return data as Row<T>;
  }, []);

  const updateRow = useCallback(async <T extends TableName>(
    table: T,
    id: string,
    updates: UpdateRow<T>,
  ): Promise<Row<T>> => {
    const { data, error } = await (supabase
      .from(table)
      .update(updates as any)
      .eq('id', id)
      .select()
      .single() as any);

    if (error) {
      console.error(`[useDatabase] updateRow(${table}, ${id}):`, error.message);
      throw new Error(error.message);
    }

    return data as Row<T>;
  }, []);

  const deleteRow = useCallback(async <T extends TableName>(
    table: T,
    id: string,
  ): Promise<void> => {
    const { error } = await (supabase
      .from(table)
      .delete()
      .eq('id', id) as any);

    if (error) {
      console.error(`[useDatabase] deleteRow(${table}, ${id}):`, error.message);
      throw new Error(error.message);
    }
  }, []);

  const softDeleteRow = useCallback(async <T extends TableName>(
    table: T,
    id: string,
  ): Promise<void> => {
    const { error } = await (supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id) as any);

    if (error) {
      console.error(`[useDatabase] softDeleteRow(${table}, ${id}):`, error.message);
      throw new Error(error.message);
    }
  }, []);

  return {
    fetchRows,
    fetchRow,
    insertRow,
    updateRow,
    deleteRow,
    softDeleteRow,
    /** Direct access to the Supabase client for advanced queries */
    client: supabase,
  };
}
