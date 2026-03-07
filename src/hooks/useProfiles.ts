import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, ProfileInsert, ProfileUpdate } from '../types/database';

export function useProfiles() {
  const { currentUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProfile = useCallback(async (userId?: string): Promise<Profile | null> => {
    const id = userId ?? currentUser.id;
    if (!id) return null;

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    setLoading(false);

    if (err) {
      setError(err.message);
      console.error('[useProfiles] Erro ao buscar perfil:', err.message);
      return null;
    }

    return data as Profile;
  }, [currentUser.id]);

  const createProfile = useCallback(async (profile: ProfileInsert): Promise<Profile | null> => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();

    setLoading(false);

    if (err) {
      setError(err.message);
      console.error('[useProfiles] Erro ao criar perfil:', err.message);
      return null;
    }

    return data as Profile;
  }, []);

  const updateProfile = useCallback(async (
    updates: ProfileUpdate,
    userId?: string,
  ): Promise<Profile | null> => {
    const id = userId ?? currentUser.id;
    if (!id) return null;

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    setLoading(false);

    if (err) {
      setError(err.message);
      console.error('[useProfiles] Erro ao atualizar perfil:', err.message);
      return null;
    }

    return data as Profile;
  }, [currentUser.id]);

  const listAllProfiles = useCallback(async (): Promise<Profile[]> => {
    if (!isAuthenticated) return [];

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    setLoading(false);

    if (err) {
      setError(err.message);
      console.error('[useProfiles] Erro ao listar perfis:', err.message);
      return [];
    }

    return (data as Profile[]) ?? [];
  }, [isAuthenticated]);

  return {
    loading,
    error,
    getProfile,
    createProfile,
    updateProfile,
    listAllProfiles,
  };
}
