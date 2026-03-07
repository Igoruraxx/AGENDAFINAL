/**
 * Supabase implementations of the data service interfaces.
 *
 * These thin wrappers move all Supabase imports to a single location,
 * keeping hooks and pages completely database-agnostic.
 */

import { supabase } from '../../lib/supabase';
import {
  IStudentService,
  IAppointmentService,
  IPaymentService,
  IEvolutionService,
  Payment,
  AppointmentInput,
  AppointmentUpdate,
  EvolutionFilters,
} from '../IDataService';
import { Student, Appointment, MuscleGroup, EvolutionPhoto, Bioimpedance, Measurement } from '../../types';
import type {
  DbStudent,
  DbStudentInsert,
  DbStudentUpdate,
  DbAppointment,
  DbAppointmentInsert,
  DbAppointmentUpdate,
  DbPayment,
  DbEvolutionPhoto,
  DbBioimpedance,
  DbMeasurement,
} from '../../types/database';

// ── Supabase Student Service ──────────────────────────────────────────────────

function dbToStudent(row: DbStudent): Student {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    plan: row.plan as Student['plan'],
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
  if (updates.name            !== undefined) u.name              = updates.name;
  if (updates.phone           !== undefined) u.phone             = updates.phone;
  if (updates.plan            !== undefined) u.plan              = updates.plan;
  if (updates.value           !== undefined) u.value             = updates.value;
  if (updates.weeklyFrequency !== undefined) u.weekly_frequency  = updates.weeklyFrequency;
  if (updates.selectedDays    !== undefined) u.selected_days     = updates.selectedDays;
  if (updates.selectedTimes   !== undefined) u.selected_times    = updates.selectedTimes;
  if (updates.isConsulting    !== undefined) u.is_consulting     = updates.isConsulting;
  if (updates.isActive        !== undefined) u.is_active         = updates.isActive;
  if (updates.billingDay      !== undefined) u.billing_day       = updates.billingDay ?? null;
  if (updates.planDuration    !== undefined) u.plan_duration     = updates.planDuration ?? null;
  if (updates.totalValue      !== undefined) u.total_value       = updates.totalValue ?? null;
  if (updates.nextBillingDate !== undefined) u.next_billing_date = updates.nextBillingDate ?? null;
  return u;
}

export class SupabaseStudentService implements IStudentService {
  async getStudents(userId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (error) throw new Error(error.message);
    return (data as DbStudent[]).map(dbToStudent);
  }

  async addStudent(userId: string, student: Omit<Student, 'id'>): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .insert(studentToInsert(student, userId))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return dbToStudent(data as DbStudent);
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<void> {
    const { error } = await supabase
      .from('students')
      .update(studentToUpdate(updates))
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteStudent(id: string): Promise<void> {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async generateShareToken(studentId: string): Promise<string> {
    const { data: existing } = await supabase
      .from('students')
      .select('share_token')
      .eq('id', studentId)
      .single();

    if ((existing as any)?.share_token) return (existing as any).share_token as string;

    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from('students')
      .update({ share_token: newToken } as any)
      .eq('id', studentId);
    if (error) throw new Error(error.message);
    return newToken;
  }

  async getStudentByToken(token: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('share_token', token as any)
      .single();
    if (error || !data) return null;
    return dbToStudent(data as DbStudent);
  }

  subscribe(userId: string, onChange: () => void): () => void {
    const channel = supabase
      .channel(`svc-students-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
}

// ── Supabase Appointment Service ──────────────────────────────────────────────

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
    notes: row.notes || undefined,
  };
}

export class SupabaseAppointmentService implements IAppointmentService {
  async getAppointments(
    userId: string,
    opts?: { startDate?: string; endDate?: string }
  ): Promise<Record<string, Appointment[]>> {
    let query = supabase
      .from('appointments')
      .select('*, students(name)')
      .eq('user_id', userId)
      .order('date')
      .order('time');

    if (opts?.startDate) query = query.gte('date', opts.startDate);
    if (opts?.endDate)   query = query.lte('date', opts.endDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const grouped: Record<string, Appointment[]> = {};
    (data || []).forEach((row: any) => {
      const apt = dbToAppointment(row as DbAppointment, row.students?.name);
      if (!grouped[row.date]) grouped[row.date] = [];
      grouped[row.date].push(apt);
    });
    return grouped;
  }

  async addAppointment(userId: string, input: AppointmentInput): Promise<Appointment> {
    const insert: DbAppointmentInsert = {
      user_id: userId,
      student_id: input.studentId,
      date: input.date,
      time: input.time,
      duration: input.duration ?? 60,
    };
    const { data, error } = await supabase.from('appointments').insert(insert).select().single();
    if (error) throw new Error(error.message);
    return dbToAppointment(data as DbAppointment, input.studentName);
  }

  async updateAppointment(id: string, updates: AppointmentUpdate): Promise<void> {
    const dbUpdates: DbAppointmentUpdate = {};
    if (updates.session_done  !== undefined) dbUpdates.session_done  = updates.session_done;
    if (updates.muscle_groups !== undefined) dbUpdates.muscle_groups = updates.muscle_groups;
    if (updates.date          !== undefined) dbUpdates.date          = updates.date;
    if (updates.time          !== undefined) dbUpdates.time          = updates.time;
    if (updates.duration      !== undefined) dbUpdates.duration      = updates.duration;
    if (updates.notes         !== undefined) dbUpdates.notes         = updates.notes;

    const { error } = await supabase.from('appointments').update(dbUpdates).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  subscribe(userId: string, onChange: () => void): () => void {
    const channel = supabase
      .channel(`svc-appointments-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
}

// ── Supabase Payment Service ──────────────────────────────────────────────────

function dbToPayment(row: DbPayment): Payment {
  return {
    id: row.id,
    studentId: row.student_id,
    amount: Number(row.amount),
    dueDate: row.due_date,
    paidAt: row.paid_at,
    status: row.status as Payment['status'],
    monthRef: row.month_ref,
  };
}

export class SupabasePaymentService implements IPaymentService {
  async getPayments(userId: string, monthRef?: string): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date');
    if (monthRef) query = query.eq('month_ref', monthRef);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as DbPayment[] || []).map(dbToPayment);
  }

  async addPayment(userId: string, input: { studentId: string; amount: number; dueDate: string; monthRef: string }): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({ user_id: userId, student_id: input.studentId, amount: input.amount, due_date: input.dueDate, month_ref: input.monthRef })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return dbToPayment(data as DbPayment);
  }

  async markAsPaid(paymentId: string): Promise<void> {
    const { error } = await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
    if (error) throw new Error(error.message);
  }

  async markAsPending(paymentId: string): Promise<void> {
    const { error } = await supabase.from('payments').update({ status: 'pending', paid_at: null }).eq('id', paymentId);
    if (error) throw new Error(error.message);
  }

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

// ── Supabase Evolution Service ────────────────────────────────────────────────

function dbToPhoto(row: DbEvolutionPhoto): EvolutionPhoto {
  return {
    id: row.id,
    studentId: row.student_id,
    date: new Date(row.date + 'T00:00:00'),
    front: row.front_url || '',
    side: row.side_url || '',
    back: row.back_url || '',
  };
}

function dbToBio(row: DbBioimpedance): Bioimpedance {
  return {
    id: row.id,
    studentId: row.student_id,
    date: new Date(row.date + 'T00:00:00'),
    image: row.image_url || '',
    data: {
      weight: Number(row.weight),
      bodyFatPct: Number(row.body_fat_pct),
      bodyFatKg: Number(row.body_fat_kg),
      muscleMass: Number(row.muscle_mass),
      visceralFat: Number(row.visceral_fat),
      leanMass: Number(row.lean_mass),
      musclePct: Number(row.muscle_pct),
    },
  };
}

function dbToMeasurement(row: DbMeasurement): Measurement {
  return {
    id: row.id,
    studentId: row.student_id,
    date: new Date(row.date + 'T00:00:00'),
    weight: Number(row.weight),
    height: Number(row.height),
    measurements: {
      chest: Number(row.chest),
      waist: Number(row.waist),
      hip: Number(row.hip),
      arm: Number(row.arm),
      thigh: Number(row.thigh),
      calf: Number(row.calf),
    },
    skinfolds: {
      triceps: Number(row.sf_triceps),
      biceps: Number(row.sf_biceps),
      subscapular: Number(row.sf_subscapular),
      suprailiac: Number(row.sf_suprailiac),
      abdominal: Number(row.sf_abdominal),
    },
  };
}

export class SupabaseEvolutionService implements IEvolutionService {
  async getPhotos({ userId, studentId }: EvolutionFilters): Promise<EvolutionPhoto[]> {
    const filters: Record<string, string> = { user_id: userId };
    if (studentId) filters.student_id = studentId;
    const { data, error } = await supabase.from('evolution_photos').select('*').match(filters).order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DbEvolutionPhoto[]).map(dbToPhoto);
  }

  async getBioimpedance({ userId, studentId }: EvolutionFilters): Promise<Bioimpedance[]> {
    const filters: Record<string, string> = { user_id: userId };
    if (studentId) filters.student_id = studentId;
    const { data, error } = await supabase.from('bioimpedance').select('*').match(filters).order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DbBioimpedance[]).map(dbToBio);
  }

  async getMeasurements({ userId, studentId }: EvolutionFilters): Promise<Measurement[]> {
    const filters: Record<string, string> = { user_id: userId };
    if (studentId) filters.student_id = studentId;
    const { data, error } = await supabase.from('measurements').select('*').match(filters).order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DbMeasurement[]).map(dbToMeasurement);
  }

  async addPhoto(userId: string, photo: Omit<EvolutionPhoto, 'id'>): Promise<EvolutionPhoto> {
    const { data, error } = await supabase
      .from('evolution_photos')
      .insert({ user_id: userId, student_id: photo.studentId, date: photo.date.toISOString().split('T')[0], front_url: photo.front, side_url: photo.side, back_url: photo.back })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return dbToPhoto(data as DbEvolutionPhoto);
  }

  async addBioimpedance(userId: string, bio: Omit<Bioimpedance, 'id'>): Promise<Bioimpedance> {
    const { data, error } = await supabase
      .from('bioimpedance')
      .insert({ user_id: userId, student_id: bio.studentId, date: bio.date.toISOString().split('T')[0], image_url: bio.image, weight: bio.data.weight, body_fat_pct: bio.data.bodyFatPct, body_fat_kg: bio.data.bodyFatKg, muscle_mass: bio.data.muscleMass, visceral_fat: bio.data.visceralFat, lean_mass: bio.data.leanMass, muscle_pct: bio.data.musclePct })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return dbToBio(data as DbBioimpedance);
  }

  async addMeasurement(userId: string, meas: Omit<Measurement, 'id'>): Promise<Measurement> {
    const { data, error } = await supabase
      .from('measurements')
      .insert({ user_id: userId, student_id: meas.studentId, date: meas.date.toISOString().split('T')[0], weight: meas.weight, height: meas.height, chest: meas.measurements.chest, waist: meas.measurements.waist, hip: meas.measurements.hip, arm: meas.measurements.arm, thigh: meas.measurements.thigh, calf: meas.measurements.calf, sf_triceps: meas.skinfolds.triceps, sf_biceps: meas.skinfolds.biceps, sf_subscapular: meas.skinfolds.subscapular, sf_suprailiac: meas.skinfolds.suprailiac, sf_abdominal: meas.skinfolds.abdominal })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return dbToMeasurement(data as DbMeasurement);
  }

  async deletePhoto(id: string): Promise<void> {
    const { error } = await supabase.from('evolution_photos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteBioimpedance(id: string): Promise<void> {
    const { error } = await supabase.from('bioimpedance').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteMeasurement(id: string): Promise<void> {
    const { error } = await supabase.from('measurements').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
