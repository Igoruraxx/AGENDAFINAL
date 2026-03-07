/**
 * LocalStorage implementations of all data services.
 *
 * The app works fully offline with zero Supabase dependency when these
 * services are active. Data is persisted in localStorage, keyed by userId
 * to provide basic multi-user isolation on the same device.
 *
 * Key scheme:
 *   fitpro:students:<userId>       → Student[]
 *   fitpro:appointments:<userId>   → StoredAppointment[]
 *   fitpro:payments:<userId>       → Payment[]
 *   fitpro:photos:<userId>         → EvolutionPhoto[]
 *   fitpro:bioimpedance:<userId>   → Bioimpedance[]
 *   fitpro:measurements:<userId>   → Measurement[]
 */

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function lsGet<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Internal storage shapes ───────────────────────────────────────────────────

interface StoredStudent extends Student {
  userId: string;
}

interface StoredAppointment {
  id: string;
  userId: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string;
  duration: number;
  sessionDone?: boolean;
  muscleGroups?: MuscleGroup[];
  notes?: string | null;
}

interface StoredPayment extends Payment {
  userId: string;
}

interface StoredPhoto extends EvolutionPhoto {
  userId: string;
  dateStr: string; // ISO string for persistence
}

interface StoredBio extends Omit<Bioimpedance, 'date'> {
  userId: string;
  dateStr: string;
}

interface StoredMeasurement extends Omit<Measurement, 'date'> {
  userId: string;
  dateStr: string;
}

// ── LocalStorage Student Service ──────────────────────────────────────────────

export class LocalStudentService implements IStudentService {
  private key(userId: string) { return `fitpro:students:${userId}`; }

  async getStudents(userId: string): Promise<Student[]> {
    return lsGet<StoredStudent>(this.key(userId)).map(({ userId: _uid, ...s }) => s as Student);
  }

  async addStudent(userId: string, student: Omit<Student, 'id'>): Promise<Student> {
    const all = lsGet<StoredStudent>(this.key(userId));
    const newStudent: StoredStudent = { ...student, id: uid(), userId };
    all.push(newStudent);
    lsSet(this.key(userId), all);
    const { userId: _uid, ...s } = newStudent;
    return s as Student;
  }

  async updateStudent(id: string, updates: Partial<Student>, userId?: string): Promise<void> {
    // Find the user bucket by scanning all fitpro:students:* keys when userId unknown
    const resolvedUserId = userId ?? this.findUserForRecord('students', id);
    if (!resolvedUserId) return;
    const key = this.key(resolvedUserId);
    const all = lsGet<StoredStudent>(key);
    lsSet(key, all.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  async deleteStudent(id: string, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? this.findUserForRecord('students', id);
    if (!resolvedUserId) return;
    const key = this.key(resolvedUserId);
    lsSet(key, lsGet<StoredStudent>(key).filter(s => s.id !== id));
  }

  async generateShareToken(studentId: string, userId?: string): Promise<string> {
    const resolvedUserId = userId ?? this.findUserForRecord('students', studentId);
    if (!resolvedUserId) throw new Error('Student not found');
    const key = this.key(resolvedUserId);
    const all = lsGet<StoredStudent>(key);
    const student = all.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');
    if (student.shareToken) return student.shareToken;
    const token = uid();
    lsSet(key, all.map(s => s.id === studentId ? { ...s, shareToken: token } : s));
    return token;
  }

  async getStudentByToken(token: string): Promise<Student | null> {
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (!lsKey?.startsWith('fitpro:students:')) continue;
      const students = lsGet<StoredStudent>(lsKey);
      const found = students.find(s => s.shareToken === token);
      if (found) {
        const { userId: _uid, ...s } = found;
        return s as Student;
      }
    }
    return null;
  }

  subscribe(_userId: string, _onChange: () => void): () => void {
    // LocalStorage doesn't have real-time events across tabs without BroadcastChannel.
    // Within the same tab mutations are synchronous, so no subscription is needed.
    return () => {};
  }

  /** Scan all localStorage keys to find which userId owns a record */
  private findUserForRecord(type: string, id: string): string | null {
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (!lsKey?.startsWith(`fitpro:${type}:`)) continue;
      const userId = lsKey.replace(`fitpro:${type}:`, '');
      const records = lsGet<{ id: string }>(lsKey);
      if (records.some(r => r.id === id)) return userId;
    }
    return null;
  }
}

// ── LocalStorage Appointment Service ─────────────────────────────────────────

export class LocalAppointmentService implements IAppointmentService {
  private key(userId: string) { return `fitpro:appointments:${userId}`; }

  async getAppointments(
    userId: string,
    opts?: { startDate?: string; endDate?: string }
  ): Promise<Record<string, Appointment[]>> {
    let all = lsGet<StoredAppointment>(this.key(userId));
    if (opts?.startDate) all = all.filter(a => a.date >= opts.startDate!);
    if (opts?.endDate)   all = all.filter(a => a.date <= opts.endDate!);

    const grouped: Record<string, Appointment[]> = {};
    all
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach(a => {
        const apt: Appointment = {
          id: a.id,
          studentId: a.studentId,
          studentName: a.studentName,
          date: new Date(a.date + 'T00:00:00'),
          time: a.time,
          duration: a.duration,
          sessionDone: a.sessionDone,
          muscleGroups: a.muscleGroups,
          notes: a.notes ?? undefined,
        };
        if (!grouped[a.date]) grouped[a.date] = [];
        grouped[a.date].push(apt);
      });
    return grouped;
  }

  async addAppointment(userId: string, input: AppointmentInput): Promise<Appointment> {
    const all = lsGet<StoredAppointment>(this.key(userId));
    const record: StoredAppointment = {
      id: uid(),
      userId,
      studentId: input.studentId,
      studentName: input.studentName,
      date: input.date,
      time: input.time,
      duration: input.duration ?? 60,
    };
    all.push(record);
    lsSet(this.key(userId), all);
    return {
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      date: new Date(record.date + 'T00:00:00'),
      time: record.time,
      duration: record.duration,
    };
  }

  async updateAppointment(id: string, updates: AppointmentUpdate): Promise<void> {
    const userId = this.findUserForAppointment(id);
    if (!userId) return;
    const key = this.key(userId);
    const mapped: Partial<StoredAppointment> = {};
    if (updates.session_done  !== undefined) mapped.sessionDone  = updates.session_done;
    if (updates.muscle_groups !== undefined) mapped.muscleGroups = updates.muscle_groups;
    if (updates.date          !== undefined) mapped.date         = updates.date;
    if (updates.time          !== undefined) mapped.time         = updates.time;
    if (updates.duration      !== undefined) mapped.duration     = updates.duration;
    if (updates.notes         !== undefined) mapped.notes        = updates.notes;
    lsSet(key, lsGet<StoredAppointment>(key).map(a => a.id === id ? { ...a, ...mapped } : a));
  }

  async deleteAppointment(id: string): Promise<void> {
    const userId = this.findUserForAppointment(id);
    if (!userId) return;
    const key = this.key(userId);
    lsSet(key, lsGet<StoredAppointment>(key).filter(a => a.id !== id));
  }

  subscribe(_userId: string, _onChange: () => void): () => void {
    return () => {};
  }

  private findUserForAppointment(id: string): string | null {
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (!lsKey?.startsWith('fitpro:appointments:')) continue;
      const userId = lsKey.replace('fitpro:appointments:', '');
      if (lsGet<StoredAppointment>(lsKey).some(a => a.id === id)) return userId;
    }
    return null;
  }
}

// ── LocalStorage Payment Service ──────────────────────────────────────────────

export class LocalPaymentService implements IPaymentService {
  private key(userId: string) { return `fitpro:payments:${userId}`; }

  async getPayments(userId: string, monthRef?: string): Promise<Payment[]> {
    let all = lsGet<StoredPayment>(this.key(userId));
    if (monthRef) all = all.filter(p => p.monthRef === monthRef);
    return all.map(({ userId: _uid, ...p }) => p as Payment);
  }

  async addPayment(userId: string, input: { studentId: string; amount: number; dueDate: string; monthRef: string }): Promise<Payment> {
    const all = lsGet<StoredPayment>(this.key(userId));
    const record: StoredPayment = {
      id: uid(),
      userId,
      studentId: input.studentId,
      amount: input.amount,
      dueDate: input.dueDate,
      monthRef: input.monthRef,
      status: 'pending',
      paidAt: null,
    };
    all.push(record);
    lsSet(this.key(userId), all);
    const { userId: _uid, ...p } = record;
    return p as Payment;
  }

  async markAsPaid(paymentId: string): Promise<void> {
    this.patchPayment(paymentId, { status: 'paid', paidAt: new Date().toISOString() });
  }

  async markAsPending(paymentId: string): Promise<void> {
    this.patchPayment(paymentId, { status: 'pending', paidAt: null });
  }

  async deletePayment(id: string): Promise<void> {
    const userId = this.findUserForPayment(id);
    if (!userId) return;
    const key = this.key(userId);
    lsSet(key, lsGet<StoredPayment>(key).filter(p => p.id !== id));
  }

  private patchPayment(id: string, patch: Partial<StoredPayment>): void {
    const userId = this.findUserForPayment(id);
    if (!userId) return;
    const key = this.key(userId);
    lsSet(key, lsGet<StoredPayment>(key).map(p => p.id === id ? { ...p, ...patch } : p));
  }

  private findUserForPayment(id: string): string | null {
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (!lsKey?.startsWith('fitpro:payments:')) continue;
      const userId = lsKey.replace('fitpro:payments:', '');
      if (lsGet<StoredPayment>(lsKey).some(p => p.id === id)) return userId;
    }
    return null;
  }
}

// ── LocalStorage Evolution Service ────────────────────────────────────────────

export class LocalEvolutionService implements IEvolutionService {
  private photoKey(userId: string)  { return `fitpro:photos:${userId}`; }
  private bioKey(userId: string)    { return `fitpro:bioimpedance:${userId}`; }
  private measKey(userId: string)   { return `fitpro:measurements:${userId}`; }

  async getPhotos({ userId, studentId }: EvolutionFilters): Promise<EvolutionPhoto[]> {
    let all = lsGet<StoredPhoto>(this.photoKey(userId));
    if (studentId) all = all.filter(p => p.studentId === studentId);
    return all.map(({ userId: _u, dateStr, ...p }) => ({ ...p, date: new Date(dateStr) }));
  }

  async getBioimpedance({ userId, studentId }: EvolutionFilters): Promise<Bioimpedance[]> {
    let all = lsGet<StoredBio>(this.bioKey(userId));
    if (studentId) all = all.filter(b => b.studentId === studentId);
    return all.map(({ userId: _u, dateStr, ...b }) => ({ ...b, date: new Date(dateStr) }));
  }

  async getMeasurements({ userId, studentId }: EvolutionFilters): Promise<Measurement[]> {
    let all = lsGet<StoredMeasurement>(this.measKey(userId));
    if (studentId) all = all.filter(m => m.studentId === studentId);
    return all.map(({ userId: _u, dateStr, ...m }) => ({ ...m, date: new Date(dateStr) }));
  }

  async addPhoto(userId: string, photo: Omit<EvolutionPhoto, 'id'>): Promise<EvolutionPhoto> {
    const all = lsGet<StoredPhoto>(this.photoKey(userId));
    const record: StoredPhoto = { ...photo, id: uid(), userId, dateStr: photo.date.toISOString() };
    all.push(record);
    lsSet(this.photoKey(userId), all);
    return { ...photo, id: record.id };
  }

  async addBioimpedance(userId: string, bio: Omit<Bioimpedance, 'id'>): Promise<Bioimpedance> {
    const all = lsGet<StoredBio>(this.bioKey(userId));
    const record: StoredBio = { ...bio, id: uid(), userId, dateStr: bio.date.toISOString() };
    all.push(record);
    lsSet(this.bioKey(userId), all);
    return { ...bio, id: record.id };
  }

  async addMeasurement(userId: string, meas: Omit<Measurement, 'id'>): Promise<Measurement> {
    const all = lsGet<StoredMeasurement>(this.measKey(userId));
    const record: StoredMeasurement = { ...meas, id: uid(), userId, dateStr: meas.date.toISOString() };
    all.push(record);
    lsSet(this.measKey(userId), all);
    return { ...meas, id: record.id };
  }

  async deletePhoto(id: string): Promise<void> {
    this.deleteFromAllUsers('photos', id);
  }

  async deleteBioimpedance(id: string): Promise<void> {
    this.deleteFromAllUsers('bioimpedance', id);
  }

  async deleteMeasurement(id: string): Promise<void> {
    this.deleteFromAllUsers('measurements', id);
  }

  private deleteFromAllUsers(type: string, id: string): void {
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (!lsKey?.startsWith(`fitpro:${type}:`)) continue;
      const all = lsGet<{ id: string }>(lsKey);
      if (all.some(r => r.id === id)) {
        lsSet(lsKey, all.filter(r => r.id !== id));
        return;
      }
    }
  }
}
