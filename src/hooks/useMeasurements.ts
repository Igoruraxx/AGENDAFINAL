import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DbMeasurement } from '../types/database';

export interface MeasurementRecord {
  id: string;
  studentId: string;
  date: string;
  weight: number;
  height: number;
  chest: number;
  waist: number;
  hip: number;
  arm: number;
  thigh: number;
  calf: number;
  sfTriceps: number;
  sfBiceps: number;
  sfSubscapular: number;
  sfSuprailiac: number;
  sfAbdominal: number;
  createdAt: string;
}

function dbToRecord(row: DbMeasurement): MeasurementRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    weight: Number(row.weight),
    height: Number(row.height),
    chest: Number(row.chest),
    waist: Number(row.waist),
    hip: Number(row.hip),
    arm: Number(row.arm),
    thigh: Number(row.thigh),
    calf: Number(row.calf),
    sfTriceps: Number(row.sf_triceps),
    sfBiceps: Number(row.sf_biceps),
    sfSubscapular: Number(row.sf_subscapular),
    sfSuprailiac: Number(row.sf_suprailiac),
    sfAbdominal: Number(row.sf_abdominal),
    createdAt: row.created_at,
  };
}

export function useMeasurements(studentId?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('measurements')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: true });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setRecords((data as DbMeasurement[] || []).map(dbToRecord));
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated, studentId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = useCallback(async (m: Omit<MeasurementRecord, 'id' | 'createdAt'>): Promise<MeasurementRecord> => {
    if (!currentUser.id) throw new Error('Usuário não autenticado');

    const { data, error: err } = await supabase
      .from('measurements')
      .insert({
        user_id: currentUser.id,
        student_id: m.studentId,
        date: m.date,
        weight: m.weight,
        height: m.height,
        chest: m.chest,
        waist: m.waist,
        hip: m.hip,
        arm: m.arm,
        thigh: m.thigh,
        calf: m.calf,
        sf_triceps: m.sfTriceps,
        sf_biceps: m.sfBiceps,
        sf_subscapular: m.sfSubscapular,
        sf_suprailiac: m.sfSuprailiac,
        sf_abdominal: m.sfAbdominal,
      })
      .select()
      .single();

    if (err) throw new Error(err.message);

    const record = dbToRecord(data as DbMeasurement);
    setRecords(prev => [...prev, record].sort((a, b) => a.date.localeCompare(b.date)));
    return record;
  }, [currentUser.id]);

  const updateRecord = useCallback(async (id: string, updates: Partial<Omit<MeasurementRecord, 'id' | 'studentId' | 'createdAt'>>): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.weight !== undefined) payload.weight = updates.weight;
    if (updates.height !== undefined) payload.height = updates.height;
    if (updates.chest !== undefined) payload.chest = updates.chest;
    if (updates.waist !== undefined) payload.waist = updates.waist;
    if (updates.hip !== undefined) payload.hip = updates.hip;
    if (updates.arm !== undefined) payload.arm = updates.arm;
    if (updates.thigh !== undefined) payload.thigh = updates.thigh;
    if (updates.calf !== undefined) payload.calf = updates.calf;
    if (updates.sfTriceps !== undefined) payload.sf_triceps = updates.sfTriceps;
    if (updates.sfBiceps !== undefined) payload.sf_biceps = updates.sfBiceps;
    if (updates.sfSubscapular !== undefined) payload.sf_subscapular = updates.sfSubscapular;
    if (updates.sfSuprailiac !== undefined) payload.sf_suprailiac = updates.sfSuprailiac;
    if (updates.sfAbdominal !== undefined) payload.sf_abdominal = updates.sfAbdominal;

    const { error: err } = await supabase
      .from('measurements')
      .update(payload)
      .eq('id', id);

    if (err) throw new Error(err.message);
    await fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('measurements')
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
