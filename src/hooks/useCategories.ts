import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DbCategory, DbCategoryInsert, DbCategoryUpdate } from '../types/database';
import type { Category } from '../types/models';

function dbToCategory(row: DbCategory): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
  };
}

export function useCategories() {
  const { currentUser, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', currentUser.id)
      .is('deleted_at', null)
      .order('name');

    if (err) {
      setError(err.message);
      console.error('[useCategories] Erro ao buscar:', err.message);
    } else {
      setCategories((data as DbCategory[]).map(dbToCategory));
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;

    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, isAuthenticated, fetchCategories]);

  const addCategory = useCallback(async (
    category: Pick<Category, 'name' | 'color' | 'icon'>,
  ): Promise<Category | null> => {
    if (!currentUser.id) return null;

    const insert: DbCategoryInsert = {
      user_id: currentUser.id,
      name: category.name,
      color: category.color,
      icon: category.icon ?? null,
    };

    const { data, error: err } = await supabase
      .from('categories')
      .insert(insert)
      .select()
      .single();

    if (err) {
      console.error('[useCategories] Erro ao adicionar:', err.message);
      throw new Error(err.message);
    }

    const newCategory = dbToCategory(data as DbCategory);
    setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
    return newCategory;
  }, [currentUser.id]);

  const updateCategory = useCallback(async (
    id: string,
    updates: Pick<Partial<Category>, 'name' | 'color' | 'icon'>,
  ): Promise<void> => {
    const dbUpdates: DbCategoryUpdate = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon ?? null;

    const { error: err } = await supabase
      .from('categories')
      .update(dbUpdates)
      .eq('id', id);

    if (err) {
      console.error('[useCategories] Erro ao atualizar:', err.message);
      throw new Error(err.message);
    }

    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    // Soft delete
    const { error: err } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (err) {
      console.error('[useCategories] Erro ao deletar:', err.message);
      throw new Error(err.message);
    }

    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
}
