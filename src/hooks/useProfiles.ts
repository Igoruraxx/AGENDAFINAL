import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile, ProfileUpdate } from '../types/database';

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
      return null;
    }
    return data as Profile;
  }, [currentUser.id]);

  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<void> => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id);

    setLoading(false);
    if (err) {
      setError(err.message);
      throw new Error(err.message);
    }
  }, [currentUser.id, isAuthenticated]);

  const updateNotifications = useCallback(async (prefs: {
    enabled?: boolean;
    notifyBefore?: boolean;
    notifyAtTime?: boolean;
    dailyListTime?: string;
  }): Promise<void> => {
    return updateProfile({
      notifications_enabled: prefs.enabled,
      notify_before: prefs.notifyBefore,
      notify_at_time: prefs.notifyAtTime,
      daily_list_time: prefs.dailyListTime,
    });
  }, [updateProfile]);

  const getPublicProfileByShareToken = useCallback(async (token: string): Promise<{
    studentName: string;
    trainerName: string;
  } | null> => {
    const { data, error: err } = await supabase
      .from('students')
      .select('name, profiles(name)')
      .eq('share_token', token)
      .single();

    if (err || !data) return null;

    return {
      studentName: (data as any).name,
      trainerName: (data as any).profiles?.name ?? '',
    };
  }, []);

  return {
    loading,
    error,
    getProfile,
    updateProfile,
    updateNotifications,
    getPublicProfileByShareToken,
  };
}
