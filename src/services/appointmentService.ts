import { supabase } from '../lib/supabase';
import type { DbAppointment, DbAppointmentInsert } from '../types/database';

/**
 * Appointment service — handles scheduling logic with business rule validation:
 * - No appointments in the past
 * - No schedule conflicts for the same student at the same time
 * - Next appointment date calculation based on weekly frequency
 */
export const appointmentService = {
  /**
   * Fetch appointments for a user, optionally limited to a date range.
   */
  async listByUser(
    userId: string,
    opts?: { startDate?: string; endDate?: string }
  ): Promise<DbAppointment[]> {
    let query = supabase
      .from('appointments')
      .select('*, students(name)')
      .eq('user_id', userId)
      .order('date')
      .order('time');

    if (opts?.startDate) query = query.gte('date', opts.startDate);
    if (opts?.endDate) query = query.lte('date', opts.endDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as DbAppointment[];
  },

  /**
   * Fetch upcoming appointments for a specific student.
   */
  async listByStudent(studentId: string, fromDate?: string): Promise<DbAppointment[]> {
    const today = fromDate ?? new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', today)
      .order('date')
      .order('time');

    if (error) throw new Error(error.message);
    return (data ?? []) as DbAppointment[];
  },

  /**
   * Create an appointment after validating business rules client-side.
   * Note: the database trigger `appointments_validate` also enforces these rules.
   */
  async create(
    userId: string,
    appointment: Omit<DbAppointmentInsert, 'user_id'>
  ): Promise<DbAppointment> {
    // Client-side validation (mirrors DB trigger)
    const today = new Date().toISOString().split('T')[0];
    if (appointment.date < today) {
      throw new Error('Não é possível agendar em datas passadas.');
    }

    // Check for schedule conflict
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('student_id', appointment.student_id)
      .eq('date', appointment.date)
      .eq('time', appointment.time)
      .limit(1);

    if (conflict && conflict.length > 0) {
      throw new Error('Conflito de horário: este aluno já tem agendamento neste horário.');
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({ ...appointment, user_id: userId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as DbAppointment;
  },

  /**
   * Mark a session as done and record the muscle groups worked.
   */
  async markDone(appointmentId: string, muscleGroups: string[]): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({ session_done: true, muscle_groups: muscleGroups })
      .eq('id', appointmentId);

    if (error) throw new Error(error.message);
  },

  /**
   * Delete an appointment by ID.
   */
  async delete(appointmentId: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) throw new Error(error.message);
  },

  /**
   * Calculate the next appointment date given the last date and weekly frequency.
   * Uses Math.floor to round down (e.g. 3×/week → every 2 days, 2×/week → every 3 days).
   * Returns an ISO date string (YYYY-MM-DD).
   */
  calcNextDate(lastDate: string, weeklyFrequency: number): string {
    const daysUntilNext = Math.floor(7 / Math.max(1, weeklyFrequency));
    const date = new Date(lastDate + 'T00:00:00');
    date.setDate(date.getDate() + daysUntilNext);
    return date.toISOString().split('T')[0];
  },

  /**
   * Get an overview of sessions done vs total for a student within a date range.
   */
  async getSessionStats(
    studentId: string,
    startDate: string,
    endDate: string
  ): Promise<{ total: number; done: number; pending: number }> {
    const { data, error } = await supabase
      .from('appointments')
      .select('session_done')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw new Error(error.message);

    const total = (data ?? []).length;
    const done = (data ?? []).filter((r: any) => r.session_done).length;
    return { total, done, pending: total - done };
  },
};
