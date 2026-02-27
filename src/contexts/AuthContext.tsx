import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User, UserPlan, PLAN_LIMITS, PlanLimits } from '../types';
import { supabase } from '../lib/supabase';
import { ensureStorageBuckets } from '../lib/setupStorage';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

export type AuthScreen = 'login' | 'register' | 'forgot';

interface AuthContextValue {
  currentUser: User;
  planLimits: PlanLimits;
  isPremium: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  authScreen: AuthScreen;
  setAuthScreen: (screen: AuthScreen) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>; /* FIX 1 */
  upgradeToPremium: () => void;
  downgradeToFree: () => void;
  updateUser: (updates: Partial<User>) => void;
  canAddStudent: (currentCount: number) => boolean;
}

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  plan: 'free',
  isAdmin: false,
  notifications: {
    enabled: true,
    notifyBefore: true,
    notifyAtTime: true,
    dailyListTime: '08:00',
  },
  subscription: {
    plan: 'free',
    status: 'expired',
    startDate: '',
    endDate: '',
    origin: 'trial',
    history: [],
  },
};

function profileToUser(profile: Profile): User {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    plan: profile.plan as UserPlan,
    isAdmin: profile.is_admin,
    notifications: {
      enabled: profile.notifications_enabled,
      notifyBefore: profile.notify_before,
      notifyAtTime: profile.notify_at_time,
      dailyListTime: profile.daily_list_time,
    },
    subscription: {
      plan: profile.plan as UserPlan,
      status: (profile.subscription_end_date && new Date(profile.subscription_end_date) > new Date()) ? 'active' : 'expired',
      startDate: profile.created_at.split('T')[0],
      endDate: profile.subscription_end_date || '',
      origin: (profile.subscription_origin as any) || 'trial',
      history: Array.isArray(profile.subscription_history) ? profile.subscription_history as any : [],
    }
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const mountedRef = useRef(true);

  const isAuthenticated = !!session;
  const planLimits = PLAN_LIMITS[currentUser.plan];
  const isPremium = currentUser.plan === 'premium';
  const isAdmin = currentUser.isAdmin;

  // Busca o perfil e atualiza currentUser
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        return data as Profile;
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
    return null;
  }, []);

  // Efeito 1: onAuthStateChange — ÚNICA fonte de verdade da sessão
  useEffect(() => {
    let resolved = false;

    const logSession = (label: string, session: Session | null) => {
      const userId = session?.user?.id ?? 'none';
      const expires = session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'n/a';
      console.log(`[Auth] ${label} user=${userId} expires=${expires}`);
    };

    // Força a busca imediata da sessão do localStorage ao montar
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Auth] getSession error:', error.message);
        }
        const s = data.session;
        if (s?.user) {
          logSession('init session found', s);
          const profile = await fetchProfile(s.user.id);
          if (mountedRef.current && profile) {
            setCurrentUser(profileToUser(profile));
          }
          setSession(s);
        } else {
          logSession('init session empty', s);
        }
      } finally {
        if (mountedRef.current && !resolved) {
          resolved = true;
          setLoading(false);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        logSession(`state change ${event}`, s ?? null);
        setSession(s ?? null);
        
        if (s?.user) {
          const profile = await fetchProfile(s.user.id);
          if (mountedRef.current) {
            if (profile) {
              setCurrentUser(profileToUser(profile));
            } else {
              // Se não achou perfil, tenta mais uma vez após 1s (fallback para delays de trigger)
              setTimeout(async () => {
                const retryProfile = await fetchProfile(s.user.id);
                if (mountedRef.current && retryProfile) {
                  setCurrentUser(profileToUser(retryProfile));
                }
              }, 1000);
            }
          }
          // Garante que os buckets de storage existem
          ensureStorageBuckets();
        } else {
          // Caso o SDK remova a sessão (ex.: refresh falhou), limpamos o usuário local
          setCurrentUser(EMPTY_USER);
        }
        
        // Finaliza o loading apenas na primeira vez que o estado é conhecido
        if (mountedRef.current && !resolved) {
          resolved = true;
          setLoading(false);
        }
      }
    );

    // Safety net: se o onAuthStateChange não disparar em 4s, libera o loading
    const safetyTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    }, 4000);

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      mountedRef.current = false; /* FIX 2 */
    };
  }, [fetchProfile]);


  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) throw new Error('Email e senha são obrigatórios');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) throw new Error('Email ou senha incorretos');
      throw new Error(error.message);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim() || !email || !password) throw new Error('Todos os campos são obrigatórios');
    if (password.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) {
      if (error.message.includes('already registered')) throw new Error('Este email já está cadastrado');
      throw new Error(error.message);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    if (!email) throw new Error('Email é obrigatório');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(EMPTY_USER);
    setAuthScreen('login');
  }, []);

  const upgradeToPremium = useCallback(async () => {
    if (!session?.user) return;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = new Date().toISOString().split('T')[0];

    const newHistoryEntry = {
      id: `h${Date.now()}`,
      plan: 'premium',
      origin: 'trial',
      startDate: startDateStr,
      endDate: endDateStr,
      durationDays: 7,
      addedBy: 'self_system',
      note: 'Ativação de 7 dias grátis pelo app'
    };

    // Busca histórico atual para anexar
    const { data: profile } = await supabase.from('profiles').select('subscription_history').eq('id', session.user.id).single();
    const currentHistory = (profile && Array.isArray(profile.subscription_history)) ? (profile.subscription_history as any[]) : [];
    const updatedHistory = [...currentHistory, newHistoryEntry];

    const { error } = await supabase.from('profiles').update({ 
      plan: 'premium',
      subscription_end_date: endDateStr,
      subscription_origin: 'trial',
      subscription_history: updatedHistory
    }).eq('id', session.user.id);

    if (!error) {
      setCurrentUser(prev => ({ 
        ...prev, 
        plan: 'premium' as UserPlan,
        subscription: {
          ...prev.subscription,
          plan: 'premium',
          status: 'active',
          endDate: endDateStr,
          origin: 'trial',
          history: updatedHistory
        }
      }));
    }
  }, [session]);

  const downgradeToFree = useCallback(async () => {
    if (!session?.user) return;
    const { error } = await supabase.from('profiles').update({ 
      plan: 'free',
      subscription_end_date: null,
      subscription_origin: 'trial' /* FIX 3 */
    }).eq('id', session.user.id);
    
    if (!error) {
      setCurrentUser(prev => ({ 
        ...prev, 
        plan: 'free' as UserPlan,
        subscription: {
          ...prev.subscription,
          plan: 'free',
          status: 'expired',
          endDate: '',
          origin: 'trial' // Mantém o origin ou ajusta conforme necessário
        }
      }));
    }
  }, [session]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!session?.user) return;
    const profileUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) profileUpdates.name = updates.name;
    if (updates.email !== undefined) profileUpdates.email = updates.email;
    if (updates.plan !== undefined) profileUpdates.plan = updates.plan;
    if (updates.notifications !== undefined) {
      profileUpdates.notifications_enabled = updates.notifications.enabled;
      profileUpdates.notify_before = updates.notifications.notifyBefore;
      profileUpdates.notify_at_time = updates.notifications.notifyAtTime;
      profileUpdates.daily_list_time = updates.notifications.dailyListTime;
    }
    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', session.user.id);
      if (error) { console.error('[Auth] Erro ao atualizar perfil:', error.message); return; }
    }
    setCurrentUser(prev => ({ ...prev, ...updates }));
  }, [session]);

  const canAddStudent = useCallback((currentCount: number) => {
    return currentCount < PLAN_LIMITS[currentUser.plan].maxStudents;
  }, [currentUser.plan]);

  return (
    <AuthContext.Provider value={{
      currentUser, planLimits, isPremium, isAdmin, isAuthenticated, loading,
      authScreen, setAuthScreen, login, register, forgotPassword, logout,
      upgradeToPremium, downgradeToFree, updateUser, canAddStudent,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
