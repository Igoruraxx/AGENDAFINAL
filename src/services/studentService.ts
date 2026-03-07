import { supabase } from '../lib/supabase';
import type { DbStudent, DbStudentInsert } from '../types/database';

const FREE_PLAN_MAX_STUDENTS = 5;

/**
 * Student service — wraps database operations with FitPro business rules:
 * - Free plan limit enforcement
 * - Share token management
 * - Soft deactivation
 */
export const studentService = {
  /**
   * List all students for a user, optionally filtered by active status.
   */
  async listByUser(userId: string, onlyActive?: boolean): Promise<DbStudent[]> {
    let query = supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (onlyActive !== undefined) {
      query = query.eq('is_active', onlyActive);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as DbStudent[];
  },

  /**
   * Count a user's active students.
   */
  async countActive(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  /**
   * Validate whether a free-plan user can add another student.
   * Throws if the limit is reached.
   */
  async validateStudentLimit(userId: string, isPremium: boolean): Promise<void> {
    if (isPremium) return;

    const count = await studentService.countActive(userId);
    if (count >= FREE_PLAN_MAX_STUDENTS) {
      throw new Error(
        `Limite de ${FREE_PLAN_MAX_STUDENTS} alunos atingido no plano gratuito. ` +
        'Faça upgrade para Premium para adicionar mais alunos.'
      );
    }
  },

  /**
   * Create a new student after validating plan limits.
   */
  async create(
    userId: string,
    studentData: Omit<DbStudentInsert, 'user_id'>,
    isPremium: boolean
  ): Promise<DbStudent> {
    await studentService.validateStudentLimit(userId, isPremium);

    const { data, error } = await supabase
      .from('students')
      .insert({ ...studentData, user_id: userId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as DbStudent;
  },

  /**
   * Deactivate a student (soft delete). Future appointments are removed
   * by the database trigger `students_on_deactivate`.
   */
  async deactivate(studentId: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', studentId);

    if (error) throw new Error(error.message);
  },

  /**
   * Hard delete a student and all their related data (cascade).
   */
  async delete(studentId: string): Promise<void> {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw new Error(error.message);
  },

  /**
   * Return the share token for a student, generating one if it doesn't exist.
   */
  async getOrCreateShareToken(studentId: string): Promise<string> {
    const { data, error } = await supabase
      .from('students')
      .select('share_token')
      .eq('id', studentId)
      .single();

    if (error) throw new Error(error.message);

    if ((data as any)?.share_token) {
      return (data as any).share_token as string;
    }

    const newToken = crypto.randomUUID();
    const { error: updateErr } = await supabase
      .from('students')
      .update({ share_token: newToken } as any)
      .eq('id', studentId);

    if (updateErr) throw new Error(updateErr.message);
    return newToken;
  },

  /**
   * Fetch a student's public data using their share token (no auth required).
   */
  async getByShareToken(token: string): Promise<DbStudent | null> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error) return null;
    return data as DbStudent;
  },
};
