import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataServices } from '../services';
import { Appointment, MuscleGroup } from '../types';
import type { AppointmentUpdate } from '../services/IDataService';

export function useAppointments() {
  const { currentUser, isAuthenticated } = useAuth();
  const { appointments: service } = useDataServices();
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (startDate?: string, endDate?: string) => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await service.getAppointments(currentUser.id, { startDate, endDate });
      setAppointments(data);
    } catch (err: any) {
      setError(err.message);
      console.error('[useAppointments] Erro ao buscar:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isAuthenticated, service]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Real-time / change subscription (no-op for localStorage backend)
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;
    return service.subscribe(currentUser.id, () => fetchAppointments());
  }, [currentUser.id, isAuthenticated, service, fetchAppointments]);

  const addAppointment = useCallback(async (apt: {
    studentId: string;
    studentName: string;
    date: string;
    time: string;
    duration?: number;
  }) => {
    if (!currentUser.id) return null;
    try {
      const newApt = await service.addAppointment(currentUser.id, apt);
      setAppointments(prev => {
        const existing = prev[apt.date] || [];
        return {
          ...prev,
          [apt.date]: [...existing, newApt].sort((a, b) => a.time.localeCompare(b.time)),
        };
      });
      return newApt;
    } catch (err: any) {
      console.error('[useAppointments] Erro ao adicionar:', err.message);
      throw err;
    }
  }, [currentUser.id, service]);

  const updateAppointment = useCallback(async (id: string, updates: AppointmentUpdate) => {
    try {
      await service.updateAppointment(id, updates);
      await fetchAppointments();
    } catch (err: any) {
      console.error('[useAppointments] Erro ao atualizar:', err.message);
      throw err;
    }
  }, [service, fetchAppointments]);

  const deleteAppointment = useCallback(async (id: string) => {
    try {
      await service.deleteAppointment(id);
      setAppointments(prev => {
        const updated: Record<string, Appointment[]> = {};
        Object.entries(prev).forEach(([key, apts]) => {
          const filtered = apts.filter(a => a.id !== id);
          if (filtered.length > 0) updated[key] = filtered;
        });
        return updated;
      });
    } catch (err: any) {
      console.error('[useAppointments] Erro ao deletar:', err.message);
      throw err;
    }
  }, [service]);

  const markSessionDone = useCallback(async (id: string, muscleGroups: MuscleGroup[]) => {
    await updateAppointment(id, { session_done: true, muscle_groups: muscleGroups });
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
