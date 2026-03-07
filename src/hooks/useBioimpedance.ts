import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DbBioimpedance } from '../types/database';

export interface BioimpedanceRecord {
  id: string;
  studentId: string;
  date: string;
  imageUrl: string | null;
  weight: number;
  bodyFatPct: number;
  bodyFatKg: number;
  muscleMass: number;
  visceralFat: number;
  leanMass: number;
  musclePct: number;
  createdAt: string;
}

function dbToRecord(row: DbBioimpedance): BioimpedanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    imageUrl: row.image_url,
    weight: Number(row.weight),
    bodyFatPct: Number(row.body_fat_pct),
    bodyFatKg: Number(row.body_fat_kg),
    muscleMass: Number(row.muscle_mass),
    visceralFat: Number(row.visceral_fat),
    leanMass: Number(row.lean_mass),
    musclePct: Number(row.muscle_pct),
    createdAt: row.created_at,
  };
}

export function useBioimpedance(studentId?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const [records, setRecords] = useState<BioimpedanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('bioimpedance')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: true });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setRecords((data as DbBioimpedance[] || []).map(dbToRecord));
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated, studentId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = useCallback(async (bio: Omit<BioimpedanceRecord, 'id' | 'createdAt'>): Promise<BioimpedanceRecord> => {
    if (!currentUser.id) throw new Error('Usuário não autenticado');

    const { data, error: err } = await supabase
      .from('bioimpedance')
      .insert({
        user_id: currentUser.id,
        student_id: bio.studentId,
        date: bio.date,
        image_url: bio.imageUrl,
        weight: bio.weight,
        body_fat_pct: bio.bodyFatPct,
        body_fat_kg: bio.bodyFatKg,
        muscle_mass: bio.muscleMass,
        visceral_fat: bio.visceralFat,
        lean_mass: bio.leanMass,
        muscle_pct: bio.musclePct,
      })
      .select()
      .single();

    if (err) throw new Error(err.message);

    const record = dbToRecord(data as DbBioimpedance);
    setRecords(prev => [...prev, record].sort((a, b) => a.date.localeCompare(b.date)));
    return record;
  }, [currentUser.id]);

  const updateRecord = useCallback(async (id: string, updates: Partial<Omit<BioimpedanceRecord, 'id' | 'studentId' | 'createdAt'>>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.weight !== undefined) payload.weight = updates.weight;
    if (updates.bodyFatPct !== undefined) payload.body_fat_pct = updates.bodyFatPct;
    if (updates.bodyFatKg !== undefined) payload.body_fat_kg = updates.bodyFatKg;
    if (updates.muscleMass !== undefined) payload.muscle_mass = updates.muscleMass;
    if (updates.visceralFat !== undefined) payload.visceral_fat = updates.visceralFat;
    if (updates.leanMass !== undefined) payload.lean_mass = updates.leanMass;
    if (updates.musclePct !== undefined) payload.muscle_pct = updates.musclePct;

    const { error: err } = await supabase
      .from('bioimpedance')
      .update(payload)
      .eq('id', id);

    if (err) throw new Error(err.message);
    await fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('bioimpedance')
      .delete()
      .eq('id', id);

    if (err) throw new Error(err.message);
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  return {
    records,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    refetch: fetchRecords,
  };
}
