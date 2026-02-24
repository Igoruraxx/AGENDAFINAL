import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { planLimits, isPremium, isAdmin } = useAuth();

  return {
    canAccessFinance: isPremium || isAdmin,
    canAccessEvolution: isPremium || isAdmin,
    canAccessAdvancedSchedule: isPremium || isAdmin,
    canExport: isPremium || isAdmin,
    canAddStudent: (currentCount: number) =>
      isAdmin || currentCount < planLimits.maxStudents,
    maxStudents: planLimits.maxStudents,
    isPremium,
    isAdmin,
  };
};
