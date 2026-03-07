import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataServices } from '../services';
import type { Payment } from '../services/IDataService';

export type { Payment };

export function usePayments(monthRef?: string) {
  const { currentUser, isAuthenticated } = useAuth();
  const { payments: service } = useDataServices();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await service.getPayments(currentUser.id, monthRef);
      setPayments(data);
    } catch (err: any) {
      setError(err.message);
      console.error('[usePayments] Erro ao buscar:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isAuthenticated, monthRef, service]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const markAsPaid = useCallback(async (paymentId: string) => {
    await service.markAsPaid(paymentId);
    setPayments(prev =>
      prev.map(p =>
        p.id === paymentId
          ? { ...p, status: 'paid' as const, paidAt: new Date().toISOString() }
          : p
      )
    );
  }, [service]);

  const markAsPending = useCallback(async (paymentId: string) => {
    await service.markAsPending(paymentId);
    setPayments(prev =>
      prev.map(p =>
        p.id === paymentId ? { ...p, status: 'pending' as const, paidAt: null } : p
      )
    );
  }, [service]);

  const addPayment = useCallback(async (payment: {
    studentId: string;
    amount: number;
    dueDate: string;
    monthRef: string;
  }) => {
    if (!currentUser.id) return;
    const newPayment = await service.addPayment(currentUser.id, payment);
    setPayments(prev => [...prev, newPayment]);
  }, [currentUser.id, service]);

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
