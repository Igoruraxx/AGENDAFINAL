import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DbEvolutionPhoto } from '../types/database';

export interface EvolutionPhotoRecord {
  id: string;
  studentId: string;
  date: string;
  frontUrl: string | null;
  sideUrl: string | null;
  backUrl: string | null;
  createdAt: string;
}

function dbToRecord(row: DbEvolutionPhoto): EvolutionPhotoRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    frontUrl: row.front_url,
    sideUrl: row.side_url,
    backUrl: row.back_url,
    createdAt: row.created_at,
  };
}

export function useEvolutionPhotos(studentId?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const [photos, setPhotos] = useState<EvolutionPhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('evolution_photos')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setPhotos((data as DbEvolutionPhoto[] || []).map(dbToRecord));
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated, studentId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const addPhoto = useCallback(async (photo: {
    studentId: string;
    date: string;
    frontUrl?: string | null;
    sideUrl?: string | null;
    backUrl?: string | null;
  }): Promise<EvolutionPhotoRecord> => {
    if (!currentUser.id) throw new Error('Usuário não autenticado');

    const { data, error: err } = await supabase
      .from('evolution_photos')
      .insert({
        user_id: currentUser.id,
        student_id: photo.studentId,
        date: photo.date,
        front_url: photo.frontUrl ?? null,
        side_url: photo.sideUrl ?? null,
        back_url: photo.backUrl ?? null,
      })
      .select()
      .single();

    if (err) throw new Error(err.message);

    const record = dbToRecord(data as DbEvolutionPhoto);
    setPhotos(prev => [record, ...prev]);
    return record;
  }, [currentUser.id]);

  const updatePhoto = useCallback(async (id: string, updates: {
    date?: string;
    frontUrl?: string | null;
    sideUrl?: string | null;
    backUrl?: string | null;
  }): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.frontUrl !== undefined) payload.front_url = updates.frontUrl;
    if (updates.sideUrl !== undefined) payload.side_url = updates.sideUrl;
    if (updates.backUrl !== undefined) payload.back_url = updates.backUrl;

    const { error: err } = await supabase
      .from('evolution_photos')
      .update(payload)
      .eq('id', id);

    if (err) throw new Error(err.message);
    await fetchPhotos();
  }, [fetchPhotos]);

  const deletePhoto = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('evolution_photos')
      .delete()
      .eq('id', id);

    if (err) throw new Error(err.message);
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    photos,
    loading,
    error,
    addPhoto,
    updatePhoto,
    deletePhoto,
    refetch: fetchPhotos,
  };
}
