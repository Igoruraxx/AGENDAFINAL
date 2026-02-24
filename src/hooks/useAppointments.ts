import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, MuscleGroup } from '../types';
import type { DbAppointment, DbAppointmentInsert, DbAppointmentUpdate } from '../types/database';

function dbToAppointment(row: DbAppointment, studentName?: string): Appointment {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: studentName || '',
    date: new Date(row.date + 'T00:00:00'),
    time: row.time,
    duration: row.duration,
    sessionDone: row.session_done,
    muscleGroups: (row.muscle_groups || []) as MuscleGroup[],
  };
}

export function useAppointments() {
  const { currentUser, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (startDate?: string, endDate?: string) => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('appointments')
      .select('*, students(name)')
      .eq('user_id', currentUser.id)
      .order('date')
      .order('time');

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      console.error('[useAppointments] Erro ao buscar:', err.message);
    } else {
      const grouped: Record<string, Appointment[]> = {};
      (data || []).forEach((row: any) => {
        const apt = dbToAppointment(row as DbAppointment, row.students?.name);
        const dateKey = row.date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(apt);
      });
      setAppointments(grouped);
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, isAuthenticated, fetchAppointments]);

  const addAppointment = useCallback(async (apt: {
    studentId: string;
    studentName: string;
    date: string;
    time: string;
    duration?: number;
  }) => {
    if (!currentUser.id) return null;

    const insert: DbAppointmentInsert = {
      user_id: currentUser.id,
      student_id: apt.studentId,
      date: apt.date,
      time: apt.time,
      duration: apt.duration || 60,
    };

    const { data, error: err } = await supabase
      .from('appointments')
      .insert(insert)
      .select()
      .single();

    if (err) {
      console.error('[useAppointments] Erro ao adicionar:', err.message);
      throw new Error(err.message);
    }

    const newApt = dbToAppointment(data as DbAppointment, apt.studentName);
    setAppointments(prev => {
      const dateKey = apt.date;
      const existing = prev[dateKey] || [];
      return { ...prev, [dateKey]: [...existing, newApt].sort((a, b) => a.time.localeCompare(b.time)) };
    });
    return newApt;
  }, [currentUser.id]);

  const updateAppointment = useCallback(async (id: string, updates: Partial<DbAppointmentUpdate>) => {
    const { error: err } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (err) {
      console.error('[useAppointments] Erro ao atualizar:', err.message);
      throw new Error(err.message);
    }

    await fetchAppointments();
  }, [fetchAppointments]);

  const deleteAppointment = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (err) {
      console.error('[useAppointments] Erro ao deletar:', err.message);
      throw new Error(err.message);
    }

    setAppointments(prev => {
      const updated: Record<string, Appointment[]> = {};
      Object.entries(prev).forEach(([key, apts]) => {
        const filtered = apts.filter(a => a.id !== id);
        if (filtered.length > 0) updated[key] = filtered;
      });
      return updated;
    });
  }, []);

  const markSessionDone = useCallback(async (id: string, muscleGroups: MuscleGroup[]) => {
    await updateAppointment(id, {
      session_done: true,
      muscle_groups: muscleGroups,
    });
  }, [updateAppointment]);

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    markSessionDone,
    refetch: fetchAppointments,
  };
}
