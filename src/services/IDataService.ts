/**
 * Service layer interfaces — decouples the UI from any specific backend.
 *
 * Implementations:
 *  - LocalStorageService  — works entirely offline, no database required
 *  - SupabaseService      — syncs with the remote Supabase PostgreSQL database
 *
 * The active implementation is injected via DataServiceContext so hooks never
 * import Supabase (or localStorage) directly.
 */

import {
  Student,
  Appointment,
  MuscleGroup,
  EvolutionPhoto,
  Bioimpedance,
  Measurement,
} from '../types';

// ── Payment (defined here because usePayments owns the type) ──────────────────

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: 'pending' | 'paid' | 'overdue';
  monthRef: string;
}

// ── Student Service ───────────────────────────────────────────────────────────

export interface IStudentService {
  getStudents(userId: string): Promise<Student[]>;
  addStudent(userId: string, student: Omit<Student, 'id'>): Promise<Student>;
  updateStudent(id: string, updates: Partial<Student>): Promise<void>;
  deleteStudent(id: string): Promise<void>;
  generateShareToken(studentId: string): Promise<string>;
  getStudentByToken(token: string): Promise<Student | null>;
  /** Returns an unsubscribe function */
  subscribe(userId: string, onChange: () => void): () => void;
}

// ── Appointment Service ───────────────────────────────────────────────────────

export interface AppointmentInput {
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  duration?: number;
}

export interface AppointmentUpdate {
  session_done?: boolean;
  muscle_groups?: MuscleGroup[];
  date?: string;
  time?: string;
  duration?: number;
  notes?: string | null;
}

export interface IAppointmentService {
  getAppointments(
    userId: string,
    opts?: { startDate?: string; endDate?: string }
  ): Promise<Record<string, Appointment[]>>;
  addAppointment(userId: string, input: AppointmentInput): Promise<Appointment>;
  updateAppointment(id: string, updates: AppointmentUpdate): Promise<void>;
  deleteAppointment(id: string): Promise<void>;
  /** Returns an unsubscribe function */
  subscribe(userId: string, onChange: () => void): () => void;
}

// ── Payment Service ───────────────────────────────────────────────────────────

export interface PaymentInput {
  studentId: string;
  amount: number;
  dueDate: string;
  monthRef: string;
}

export interface IPaymentService {
  getPayments(userId: string, monthRef?: string): Promise<Payment[]>;
  addPayment(userId: string, input: PaymentInput): Promise<Payment>;
  markAsPaid(paymentId: string): Promise<void>;
  markAsPending(paymentId: string): Promise<void>;
  deletePayment(id: string): Promise<void>;
}

// ── Evolution Service ─────────────────────────────────────────────────────────

export interface EvolutionFilters {
  userId: string;
  studentId?: string;
}

export interface IEvolutionService {
  getPhotos(filters: EvolutionFilters): Promise<EvolutionPhoto[]>;
  getBioimpedance(filters: EvolutionFilters): Promise<Bioimpedance[]>;
  getMeasurements(filters: EvolutionFilters): Promise<Measurement[]>;

  addPhoto(userId: string, photo: Omit<EvolutionPhoto, 'id'>): Promise<EvolutionPhoto>;
  addBioimpedance(userId: string, bio: Omit<Bioimpedance, 'id'>): Promise<Bioimpedance>;
  addMeasurement(userId: string, meas: Omit<Measurement, 'id'>): Promise<Measurement>;

  deletePhoto(id: string): Promise<void>;
  deleteBioimpedance(id: string): Promise<void>;
  deleteMeasurement(id: string): Promise<void>;
}

// ── Aggregated service bundle ─────────────────────────────────────────────────

export interface IDataServices {
  students: IStudentService;
  appointments: IAppointmentService;
  payments: IPaymentService;
  evolution: IEvolutionService;
}
