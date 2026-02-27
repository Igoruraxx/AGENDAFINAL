export interface Student {
  id: string;
  name: string;
  phone: string;
  plan: 'monthly' | 'session' | 'long_term';
  value: number;
  weeklyFrequency: number;
  selectedDays: string[];
  selectedTimes: string[];
  isConsulting: boolean;
  isActive: boolean;
  billingDay?: number | null;
  shareToken?: string | null; // token único para link público de evolução
  planDuration?: number | null; // em meses
  totalValue?: number | null;
  nextBillingDate?: string | null; // yyyy-mm-dd
}

export type MuscleGroup =
  | 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps'
  | 'quadriceps' | 'posterior' | 'gluteos' | 'panturrilha'
  | 'abdomen' | 'trapezio' | 'antebraco' | 'full_body' | 'cardio';

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  date: Date;
  time: string;
  duration: number;
  sessionDone?: boolean;
  muscleGroups?: MuscleGroup[];
  phone?: string;
}

export interface EvolutionPhoto {
  id: string;
  studentId: string;
  date: Date;
  front: string;
  side: string;
  back: string;
}

export interface Bioimpedance {
  id: string;
  studentId: string;
  date: Date;
  image: string;
  data: {
    weight: number;
    bodyFatPct: number;
    bodyFatKg: number;
    muscleMass: number;
    visceralFat: number;
    leanMass: number;
    musclePct: number;
  };
}

export interface Measurement {
  id: string;
  studentId: string;
  date: Date;
  weight: number;
  height: number;
  measurements: {
    chest: number;
    waist: number;
    hip: number;
    arm: number;
    thigh: number;
    calf: number;
  };
  skinfolds: {
    triceps: number;
    biceps: number;
    subscapular: number;
    suprailiac: number;
    abdominal: number;
  };
}

export type UserPlan = 'free' | 'premium';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
export type PlanOrigin = 'paid' | 'courtesy' | 'trial';

export interface PlanHistoryEntry {
  id: string;
  plan: UserPlan;
  origin: PlanOrigin;
  startDate: string;
  endDate: string;
  durationDays: number;
  addedBy: string;
  note?: string;
}

export interface Subscription {
  plan: UserPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  origin: PlanOrigin;
  history: PlanHistoryEntry[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: UserPlan;
  status: 'active' | 'inactive';
  students: number;
  joinDate: string;
  subscription: Subscription;
}

export interface PlanLimits {
  maxStudents: number;
  hasFinanceModule: boolean;
  hasEvolutionModule: boolean;
  hasAdvancedSchedule: boolean;
  hasExport: boolean;
  hasPrioritySupport: boolean;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  free: {
    maxStudents: 5,
    hasFinanceModule: false,
    hasEvolutionModule: false,
    hasAdvancedSchedule: false,
    hasExport: false,
    hasPrioritySupport: false,
  },
  premium: {
    maxStudents: Infinity,
    hasFinanceModule: true,
    hasEvolutionModule: true,
    hasAdvancedSchedule: true,
    hasExport: true,
    hasPrioritySupport: true,
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  isAdmin: boolean;
  notifications: {
    enabled: boolean;
    notifyBefore: boolean;
    notifyAtTime: boolean;
    dailyListTime: string;
  };
  subscription: Subscription;
}
