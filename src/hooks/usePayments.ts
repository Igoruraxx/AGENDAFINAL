import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DbPayment } from '../types/database';

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: 'pending' | 'paid' | 'overdue';
  monthRef: string;
}

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

export function usePayments(monthRef?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('payments')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('due_date');

    if (monthRef) query = query.eq('month_ref', monthRef);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      console.error('[usePayments] Erro ao buscar:', err.message);
    } else {
      setPayments((data as DbPayment[] || []).map(dbToPayment));
    }
    setLoading(false);
  }, [currentUser.id, isAuthenticated, monthRef]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const markAsPaid = useCallback(async (paymentId: string) => {
    const { error: err } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (err) throw new Error(err.message);

    setPayments(prev =>
      prev.map(p =>
        p.id === paymentId
          ? { ...p, status: 'paid' as const, paidAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const markAsPending = useCallback(async (paymentId: string) => {
    const { error: err } = await supabase
      .from('payments')
      .update({ status: 'pending', paid_at: null })
      .eq('id', paymentId);

    if (err) throw new Error(err.message);

    setPayments(prev =>
      prev.map(p =>
        p.id === paymentId ? { ...p, status: 'pending' as const, paidAt: null } : p
      )
    );
  }, []);

  const addPayment = useCallback(async (payment: {
    studentId: string;
    amount: number;
    dueDate: string;
    monthRef: string;
  }) => {
    if (!currentUser.id) return;

    const { data, error: err } = await supabase
      .from('payments')
      .insert({
        user_id: currentUser.id,
        student_id: payment.studentId,
        amount: payment.amount,
        due_date: payment.dueDate,
        month_ref: payment.monthRef,
      })
      .select()
      .single();

    if (err) throw new Error(err.message);

    setPayments(prev => [...prev, dbToPayment(data as DbPayment)]);
  }, [currentUser.id]);

  return {
    payments,
    loading,
    error,
    markAsPaid,
    markAsPending,
    addPayment,
    refetch: fetchPayments,
  };
}
