import { supabase } from '../lib/supabase';
import type { DbPayment } from '../types/database';

/**
 * Billing service — manages payment lifecycle:
 * - Auto-generate monthly payments for monthly-plan students
 * - Mark payments as paid/pending
 * - Mark overdue payments
 * - Summarise financial totals for a given month
 */
export const billingService = {
  /**
   * Fetch all payments for a user, optionally filtered by month reference (YYYY-MM).
   */
  async listByUser(userId: string, monthRef?: string): Promise<DbPayment[]> {
    let query = supabase
      .from('payments')
      .select('*, students(name)')
      .eq('user_id', userId)
      .order('due_date');

    if (monthRef) query = query.eq('month_ref', monthRef);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as DbPayment[];
  },

  /**
   * Fetch all payments for a specific student.
   */
  async listByStudent(studentId: string): Promise<DbPayment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as DbPayment[];
  },

  /**
   * Generate a monthly payment for a student if one doesn't already exist.
   * @param monthRef - Format 'YYYY-MM'
   */
  async generateMonthlyPayment(opts: {
    userId: string;
    studentId: string;
    amount: number;
    billingDay: number;
    monthRef: string;
  }): Promise<DbPayment> {
    // Avoid duplicates
    const { data: existing } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', opts.studentId)
      .eq('month_ref', opts.monthRef)
      .maybeSingle();

    if (existing) return existing as DbPayment;

    // Build due_date: respect month boundaries (e.g. billing_day=31 in February → last day)
    const [year, month] = opts.monthRef.split('-').map(Number);
    const lastDayOfMonth = new Date(year, month, 0).getDate(); // day=0 gives last day of prev month
    const safeDay = Math.min(opts.billingDay, lastDayOfMonth);
    const dueDate = new Date(year, month - 1, safeDay);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: opts.userId,
        student_id: opts.studentId,
        amount: opts.amount,
        due_date: dueDateStr,
        month_ref: opts.monthRef,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as DbPayment;
  },

  /**
   * Mark a payment as paid.
   */
  async markAsPaid(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) throw new Error(error.message);
  },

  /**
   * Revert a payment back to pending.
   */
  async markAsPending(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'pending', paid_at: null })
      .eq('id', paymentId);

    if (error) throw new Error(error.message);
  },

  /**
   * Update all pending payments whose due_date has passed to 'overdue'.
   * Call this on app startup or at a scheduled interval.
   */
  async updateOverdueStatuses(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'overdue' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id');

    if (error) throw new Error(error.message);
    return (data ?? []).length;
  },

  /**
   * Calculate financial totals for a given month.
   */
  async getMonthSummary(
    userId: string,
    monthRef: string
  ): Promise<{
    totalExpected: number;
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    paymentCount: number;
    paidCount: number;
  }> {
    const payments = await billingService.listByUser(userId, monthRef);

    const totalExpected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const received = payments.filter(p => p.status === 'paid');
    const pending = payments.filter(p => p.status === 'pending');
    const overdue = payments.filter(p => p.status === 'overdue');

    return {
      totalExpected,
      totalReceived: received.reduce((sum, p) => sum + Number(p.amount), 0),
      totalPending: pending.reduce((sum, p) => sum + Number(p.amount), 0),
      totalOverdue: overdue.reduce((sum, p) => sum + Number(p.amount), 0),
      paymentCount: payments.length,
      paidCount: received.length,
    };
  },

  /**
   * Auto-generate monthly payments for all active monthly-plan students of a user.
   * Typically called at the start of each month.
   */
  async generateAllMonthlyPayments(userId: string, monthRef: string): Promise<number> {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, value, billing_day')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('plan', 'monthly');

    if (error) throw new Error(error.message);
    if (!students || students.length === 0) return 0;

    let count = 0;
    for (const s of students) {
      const billingDay = (s as any).billing_day ?? 1;
      await billingService.generateMonthlyPayment({
        userId,
        studentId: (s as any).id,
        amount: Number((s as any).value),
        billingDay,
        monthRef,
      });
      count++;
    }

    return count;
  },
};
