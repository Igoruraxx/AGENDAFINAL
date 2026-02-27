import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student } from '../types';
import type { DbStudent, DbStudentInsert, DbStudentUpdate } from '../types/database';

function dbToStudent(row: DbStudent): Student {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    plan: row.plan as 'monthly' | 'session' | 'long_term',
    value: Number(row.value),
    weeklyFrequency: row.weekly_frequency,
    selectedDays: row.selected_days,
    selectedTimes: row.selected_times,
    isConsulting: row.is_consulting,
    isActive: row.is_active,
    billingDay: row.billing_day ?? undefined,
    shareToken: (row as any).share_token ?? undefined,
    planDuration: row.plan_duration ?? undefined,
    totalValue: row.total_value ? Number(row.total_value) : undefined,
    nextBillingDate: row.next_billing_date ?? undefined,
  };
}

function studentToInsert(student: Omit<Student, 'id'>, userId: string): DbStudentInsert {
  return {
    user_id: userId,
    name: student.name,
    phone: student.phone,
    plan: student.plan,
    value: student.value,
    weekly_frequency: student.weeklyFrequency,
    selected_days: student.selectedDays,
    selected_times: student.selectedTimes,
    is_consulting: student.isConsulting,
    is_active: student.isActive,
    billing_day: student.billingDay ?? null,
    plan_duration: student.planDuration ?? null,
    total_value: student.totalValue ?? null,
    next_billing_date: student.nextBillingDate ?? null,
  };
}

function studentToUpdate(updates: Partial<Student>): DbStudentUpdate {
  const u: DbStudentUpdate = {};
  if (updates.name !== undefined) u.name = updates.name;
  if (updates.phone !== undefined) u.phone = updates.phone;
  if (updates.plan !== undefined) u.plan = updates.plan;
  if (updates.value !== undefined) u.value = updates.value;
  if (updates.weeklyFrequency !== undefined) u.weekly_frequency = updates.weeklyFrequency;
  if (updates.selectedDays !== undefined) u.selected_days = updates.selectedDays;
  if (updates.selectedTimes !== undefined) u.selected_times = updates.selectedTimes;
  if (updates.isConsulting !== undefined) u.is_consulting = updates.isConsulting;
  if (updates.isActive !== undefined) u.is_active = updates.isActive;
  if (updates.billingDay !== undefined) u.billing_day = updates.billingDay ?? null;
  if (updates.planDuration !== undefined) u.plan_duration = updates.planDuration ?? null;
  if (updates.totalValue !== undefined) u.total_value = updates.totalValue ?? null;
  if (updates.nextBillingDate !== undefined) u.next_billing_date = updates.nextBillingDate ?? null;
  return u;
}

export function useStudents() {
  const { currentUser, isAuthenticated } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('name');

    if (err) {
      setError(err.message);
      console.error('[useStudents] Erro ao buscar:', err.message);
    } else {
      setStudents((data as DbStudent[]).map(dbToStudent));
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;

    const channel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, isAuthenticated, fetchStudents]);

  const addStudent = useCallback(async (student: Omit<Student, 'id'>) => {
    if (!currentUser.id) return null;

    const { data, error: err } = await supabase
      .from('students')
      .insert(studentToInsert(student, currentUser.id))
      .select()
      .single();

    if (err) {
      console.error('[useStudents] Erro ao adicionar:', err.message);
      throw new Error(err.message);
    }

    const newStudent = dbToStudent(data as DbStudent);
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
    return newStudent;
  }, [currentUser.id]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    const { error: err } = await supabase
      .from('students')
      .update(studentToUpdate(updates))
      .eq('id', id);

    if (err) {
      console.error('[useStudents] Erro ao atualizar:', err.message);
      throw new Error(err.message);
    }

    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (err) {
      console.error('[useStudents] Erro ao deletar:', err.message);
      throw new Error(err.message);
    }

    setStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  // Garante que o aluno tem share_token e retorna-o
  const generateShareToken = useCallback(async (studentId: string): Promise<string> => {
    // Primeiro busca o token existente
    const { data: existing } = await supabase
      .from('students')
      .select('share_token')
      .eq('id', studentId)
      .single();

    if ((existing as any)?.share_token) {
      return (existing as any).share_token as string;
    }

    // Gera um UUID aleatório se não existir
    const newToken = crypto.randomUUID();
    const { error: err } = await supabase
      .from('students')
      .update({ share_token: newToken } as any)
      .eq('id', studentId);

    if (err) throw new Error(err.message);

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, shareToken: newToken } : s));
    return newToken;
  }, []);

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    generateShareToken,
    refetch: fetchStudents,
  };
}
