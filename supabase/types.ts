/**
 * Supabase TypeScript types — auto-generated from the database schema.
 * Source of truth: supabase/schema.sql and supabase/migrations/*.sql
 *
 * Import from src/types/database.ts in application code.
 * This file is the canonical definition kept alongside the SQL files.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ── profiles ─────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          plan: 'free' | 'premium';
          is_admin: boolean;
          notifications_enabled: boolean;
          notify_before: boolean;
          notify_at_time: boolean;
          daily_list_time: string;
          subscription_end_date: string | null;
          subscription_origin: 'trial' | 'courtesy' | 'paid' | null;
          subscription_history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          plan?: 'free' | 'premium';
          is_admin?: boolean;
          notifications_enabled?: boolean;
          notify_before?: boolean;
          notify_at_time?: boolean;
          daily_list_time?: string;
          subscription_end_date?: string | null;
          subscription_origin?: 'trial' | 'courtesy' | 'paid' | null;
          subscription_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          plan?: 'free' | 'premium';
          is_admin?: boolean;
          notifications_enabled?: boolean;
          notify_before?: boolean;
          notify_at_time?: boolean;
          daily_list_time?: string;
          subscription_end_date?: string | null;
          subscription_origin?: 'trial' | 'courtesy' | 'paid' | null;
          subscription_history?: Json;
          updated_at?: string;
        };
      };
      // ── events ───────────────────────────────────────────
      events: {
        Row: {
          id: string;
          user_id: string;
          student_id: string | null;
          title: string;
          description: string | null;
          type: 'appointment' | 'task' | 'reminder' | 'block';
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          date: string;
          start_time: string;
          end_time: string | null;
          duration: number;
          is_recurring: boolean;
          recurrence: Json | null;
          location: string | null;
          notes: string | null;
          color: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id?: string | null;
          title: string;
          description?: string | null;
          type?: 'appointment' | 'task' | 'reminder' | 'block';
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          date: string;
          start_time: string;
          end_time?: string | null;
          duration?: number;
          is_recurring?: boolean;
          recurrence?: Json | null;
          location?: string | null;
          notes?: string | null;
          color?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string | null;
          title?: string;
          description?: string | null;
          type?: 'appointment' | 'task' | 'reminder' | 'block';
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          date?: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number;
          is_recurring?: boolean;
          recurrence?: Json | null;
          location?: string | null;
          notes?: string | null;
          color?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      // ── categories ───────────────────────────────────────
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          icon?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      // ── event_categories ─────────────────────────────────
      event_categories: {
        Row: {
          event_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          category_id?: string;
        };
      };
      // ── students ─────────────────────────────────────────
      students: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          plan: 'monthly' | 'session' | 'long_term';
          plan_duration: number | null;
          value: number;
          total_value: number | null;
          weekly_frequency: number;
          selected_days: string[];
          selected_times: string[];
          is_consulting: boolean;
          is_active: boolean;
          billing_day: number | null;
          next_billing_date: string | null;
          share_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string;
          plan?: 'monthly' | 'session' | 'long_term';
          plan_duration?: number | null;
          value?: number;
          total_value?: number | null;
          weekly_frequency?: number;
          selected_days?: string[];
          selected_times?: string[];
          is_consulting?: boolean;
          is_active?: boolean;
          billing_day?: number | null;
          next_billing_date?: string | null;
          share_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          plan?: 'monthly' | 'session' | 'long_term';
          plan_duration?: number | null;
          value?: number;
          total_value?: number | null;
          weekly_frequency?: number;
          selected_days?: string[];
          selected_times?: string[];
          is_consulting?: boolean;
          is_active?: boolean;
          billing_day?: number | null;
          next_billing_date?: string | null;
          share_token?: string | null;
          updated_at?: string;
        };
      };
      // ── appointments ─────────────────────────────────────
      appointments: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          date: string;
          time: string;
          duration: number;
          session_done: boolean;
          muscle_groups: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          date: string;
          time: string;
          duration?: number;
          session_done?: boolean;
          muscle_groups?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          date?: string;
          time?: string;
          duration?: number;
          session_done?: boolean;
          muscle_groups?: string[];
          notes?: string | null;
          updated_at?: string;
        };
      };
      // ── evolution_photos ─────────────────────────────────
      evolution_photos: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          date: string;
          front_url: string | null;
          side_url: string | null;
          back_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          date: string;
          front_url?: string | null;
          side_url?: string | null;
          back_url?: string | null;
          created_at?: string;
        };
        Update: {
          date?: string;
          front_url?: string | null;
          side_url?: string | null;
          back_url?: string | null;
        };
      };
      // ── bioimpedance ─────────────────────────────────────
      bioimpedance: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          date: string;
          image_url: string | null;
          weight: number;
          body_fat_pct: number;
          body_fat_kg: number;
          muscle_mass: number;
          visceral_fat: number;
          lean_mass: number;
          muscle_pct: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          date: string;
          image_url?: string | null;
          weight: number;
          body_fat_pct: number;
          body_fat_kg: number;
          muscle_mass: number;
          visceral_fat: number;
          lean_mass: number;
          muscle_pct: number;
          created_at?: string;
        };
        Update: {
          date?: string;
          image_url?: string | null;
          weight?: number;
          body_fat_pct?: number;
          body_fat_kg?: number;
          muscle_mass?: number;
          visceral_fat?: number;
          lean_mass?: number;
          muscle_pct?: number;
        };
      };
      // ── measurements ─────────────────────────────────────
      measurements: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          date: string;
          weight: number;
          height: number;
          chest: number;
          waist: number;
          hip: number;
          arm: number;
          thigh: number;
          calf: number;
          sf_triceps: number;
          sf_biceps: number;
          sf_subscapular: number;
          sf_suprailiac: number;
          sf_abdominal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          date: string;
          weight: number;
          height: number;
          chest?: number;
          waist?: number;
          hip?: number;
          arm?: number;
          thigh?: number;
          calf?: number;
          sf_triceps?: number;
          sf_biceps?: number;
          sf_subscapular?: number;
          sf_suprailiac?: number;
          sf_abdominal?: number;
          created_at?: string;
        };
        Update: {
          date?: string;
          weight?: number;
          height?: number;
          chest?: number;
          waist?: number;
          hip?: number;
          arm?: number;
          thigh?: number;
          calf?: number;
          sf_triceps?: number;
          sf_biceps?: number;
          sf_subscapular?: number;
          sf_suprailiac?: number;
          sf_abdominal?: number;
        };
      };
      // ── payments ─────────────────────────────────────────
      payments: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          amount: number;
          due_date: string;
          paid_at: string | null;
          status: 'pending' | 'paid' | 'overdue';
          month_ref: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          amount: number;
          due_date: string;
          paid_at?: string | null;
          status?: 'pending' | 'paid' | 'overdue';
          month_ref: string;
          created_at?: string;
        };
        Update: {
          amount?: number;
          due_date?: string;
          paid_at?: string | null;
          status?: 'pending' | 'paid' | 'overdue';
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ── Convenience aliases ───────────────────────────────────────────────────────

export type Profile            = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert      = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate      = Database['public']['Tables']['profiles']['Update'];

export type DbEvent            = Database['public']['Tables']['events']['Row'];
export type DbEventInsert      = Database['public']['Tables']['events']['Insert'];
export type DbEventUpdate      = Database['public']['Tables']['events']['Update'];

export type DbCategory         = Database['public']['Tables']['categories']['Row'];
export type DbCategoryInsert   = Database['public']['Tables']['categories']['Insert'];
export type DbCategoryUpdate   = Database['public']['Tables']['categories']['Update'];

export type DbEventCategory    = Database['public']['Tables']['event_categories']['Row'];

export type DbStudent          = Database['public']['Tables']['students']['Row'];
export type DbStudentInsert    = Database['public']['Tables']['students']['Insert'];
export type DbStudentUpdate    = Database['public']['Tables']['students']['Update'];

export type DbAppointment      = Database['public']['Tables']['appointments']['Row'];
export type DbAppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
export type DbAppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export type DbEvolutionPhoto   = Database['public']['Tables']['evolution_photos']['Row'];
export type DbBioimpedance     = Database['public']['Tables']['bioimpedance']['Row'];
export type DbMeasurement      = Database['public']['Tables']['measurements']['Row'];
export type DbPayment          = Database['public']['Tables']['payments']['Row'];
export type DbPaymentInsert    = Database['public']['Tables']['payments']['Insert'];
export type DbPaymentUpdate    = Database['public']['Tables']['payments']['Update'];
