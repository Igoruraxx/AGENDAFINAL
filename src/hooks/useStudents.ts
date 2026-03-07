import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataServices } from '../services';
import { Student } from '../types';

export function useStudents() {
  const { currentUser, isAuthenticated } = useAuth();
  const { students: service } = useDataServices();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!isAuthenticated || !currentUser.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await service.getStudents(currentUser.id);
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
      console.error('[useStudents] Erro ao buscar:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isAuthenticated, service]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Real-time / change subscription (no-op for localStorage backend)
  useEffect(() => {
    if (!isAuthenticated || !currentUser.id) return;
    return service.subscribe(currentUser.id, fetchStudents);
  }, [currentUser.id, isAuthenticated, service, fetchStudents]);

  const addStudent = useCallback(async (student: Omit<Student, 'id'>) => {
    if (!currentUser.id) return null;
    try {
      const newStudent = await service.addStudent(currentUser.id, student);
      setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
      return newStudent;
    } catch (err: any) {
      console.error('[useStudents] Erro ao adicionar:', err.message);
      throw err;
    }
  }, [currentUser.id, service]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    try {
      await service.updateStudent(id, updates);
      setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    } catch (err: any) {
      console.error('[useStudents] Erro ao atualizar:', err.message);
      throw err;
    }
  }, [service]);

  const deleteStudent = useCallback(async (id: string) => {
    try {
      await service.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('[useStudents] Erro ao deletar:', err.message);
      throw err;
    }
  }, [service]);

  const generateShareToken = useCallback(async (studentId: string): Promise<string> => {
    const token = await service.generateShareToken(studentId);
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, shareToken: token } : s));
    return token;
  }, [service]);

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    generateShareToken,
    refetch: fetchStudents,
  };
}
