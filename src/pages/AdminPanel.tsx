import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Users,
  Shield,
  Crown,
  ArrowUpCircle,
  ArrowLeft,
  CreditCard,
  Gift,
  History,
  Calendar,
  Clock,
  Search,
  ChevronRight,
  Check,
  AlertTriangle,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { AdminUser, PlanHistoryEntry, UserPlan, PlanOrigin } from '../types';

// ── Helper: format date ──
const fmt = (d: string) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtFull = (d: string) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const daysRemaining = (endDate: string): number => {
  if (!endDate) return 0;
  // Considera o fim do dia de expiração (23:59:59)
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days + 1); // +1 para contar o dia atual se ainda não acabou
};

const todayStr = () => new Date().toISOString().split('T')[0];

// Mock Data removed - using Supabase

// ══════════════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════════════

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'premium'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [upgradeNote, setUpgradeNote] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Busca perfis
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      // Busca contagem de alunos por treinador (tenta de forma resiliente)
      let studentCounts: Record<string, number> = {};
      try {
        const { data: sData, error: sError } = await supabase
          .from('students')
          .select('user_id');

        if (!sError && sData) {
          studentCounts = sData.reduce((acc: any, curr: any) => {
            acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
            return acc;
          }, {});
        } else if (sError) {
          console.warn('[AdminPanel] Falha ao contar alunos:', sError.message);
        }
      } catch (sErr) {
        console.warn('[AdminPanel] Erro na query de alunos:', sErr);
      }

      const mappedUsers: AdminUser[] = (profiles || []).map((p: any) => {
        const joinStr = (p.created_at || new Date().toISOString()).split('T')[0];
        const subEndDate = p.subscription_end_date || '';
        // Expira apenas após o fim do dia (23:59:59)
        const isExpired = subEndDate ? new Date(subEndDate + 'T23:59:59') < new Date() : false;
        
        return {
          id: p.id,
          name: p.name || 'Sem nome',
          email: p.email || 'Sem email',
          phone: p.phone || '',
          plan: p.plan || 'free',
          status: isExpired ? 'inactive' : 'active',
          students: studentCounts[p.id] || 0,
          joinDate: joinStr,
          subscription: {
            plan: p.plan || 'free',
            status: isExpired ? 'expired' : 'active',
            startDate: joinStr,
            endDate: subEndDate,
            origin: (p.subscription_origin as PlanOrigin) || 'trial',
            history: Array.isArray(p.subscription_history) ? p.subscription_history : [],
          }
        };
      });

      console.log(`[AdminPanel] ${mappedUsers.length} usuários carregados.`);
      setUsers(mappedUsers);
    } catch (err: any) {
      console.error('[AdminPanel] Erro fatal no carregamento:', err);
      showToast(err.message || 'Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Modal states
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [showRemoveTimeModal, setShowRemoveTimeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [addDaysAmount, setAddDaysAmount] = useState(30);
  const [addOrigin, setAddOrigin] = useState<PlanOrigin>('paid');
  const [addNote, setAddNote] = useState('');
  const [removeDaysAmount, setRemoveDaysAmount] = useState(7);
  const [removeNote, setRemoveNote] = useState('');
  const [upgradeOrigin, setUpgradeOrigin] = useState<PlanOrigin>('paid');
  const [upgradeDays, setUpgradeDays] = useState(30);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [users, selectedUserId]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlan = filterPlan === 'all' || user.plan === filterPlan;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [users, searchTerm, filterPlan, filterStatus]);

  const stats = useMemo(() => {
    // Garantia de que users seja array
    const uList = users || [];
    return {
      total: uList.length,
      active: uList.filter(u => u.status === 'active').length,
      premium: uList.filter(u => u.plan === 'premium').length,
      free: uList.filter(u => u.plan === 'free').length,
      paidPlans: uList.reduce((acc, u) => 
        acc + (u.subscription?.history?.filter(h => h.origin === 'paid').length || 0)
      , 0),
      trialPlans: uList.reduce((acc, u) => 
        acc + (u.subscription?.history?.filter(h => h.origin === 'trial').length || 0)
      , 0),
      courtesyPlans: uList.reduce((acc, u) => 
        acc + (u.subscription?.history?.filter(h => h.origin === 'courtesy').length || 0)
      , 0),
    };
  }, [users]);

  // ── Actions ──
  const handleAddTime = () => {
    if (!selectedUser || addDaysAmount <= 0) return;
    const currentEnd = selectedUser.subscription.endDate || todayStr();
    const baseDate = new Date(currentEnd) > new Date() ? currentEnd : todayStr();
    const newEnd = addDays(baseDate, addDaysAmount);
    
    const newEntry: PlanHistoryEntry = {
      id: `h${Date.now()}`,
      plan: selectedUser.subscription.plan,
      origin: addOrigin,
      startDate: baseDate,
      endDate: newEnd,
      durationDays: addDaysAmount,
      addedBy: 'Admin',
      note: addNote || `+${addDaysAmount} dias (${addOrigin === 'paid' ? 'pago' : addOrigin === 'trial' ? 'trial' : 'cortesia'})`,
    };

    const newHistory = [...selectedUser.subscription.history, newEntry];

    // Persistir no Supabase
    supabase.from('profiles').update({
      subscription_end_date: newEnd,
      subscription_origin: addOrigin,
      subscription_history: newHistory as any,
      plan: 'premium'
    }).eq('id', selectedUser.id).then(({ error }) => {
      if (error) {
        showToast('Erro ao salvar no banco: ' + error.message, 'error');
      } else {
        setUsers(prev => prev.map(u => {
          if (u.id !== selectedUser.id) return u;
          return {
            ...u,
            plan: 'premium',
            subscription: {
              ...u.subscription,
              plan: 'premium',
              endDate: newEnd,
              status: 'active' as const,
              origin: addOrigin,
              history: newHistory,
            },
            status: 'active' as const,
          };
        }));
        showToast(`+${addDaysAmount} dias adicionados para ${selectedUser.name}`);
      }
    });

    setShowAddTimeModal(false);
    setAddDaysAmount(30);
    setAddNote('');
  };

  const handleRemoveTime = () => {
    if (!selectedUser || removeDaysAmount <= 0) return;
    const currentEnd = selectedUser.subscription.endDate || todayStr();
    const newEnd = addDays(currentEnd, -removeDaysAmount);
    const isExpired = new Date(newEnd) <= new Date();
    
    const newEntry: PlanHistoryEntry = {
      id: `h${Date.now()}`,
      plan: selectedUser.subscription.plan,
      origin: selectedUser.subscription.origin,
      startDate: todayStr(),
      endDate: newEnd,
      durationDays: -removeDaysAmount,
      addedBy: 'Admin',
      note: removeNote || `-${removeDaysAmount} dias removidos`,
    };

    const newHistory = [...selectedUser.subscription.history, newEntry];

    // Persistir no Supabase
    supabase.from('profiles').update({
      subscription_end_date: newEnd,
      subscription_history: newHistory as any,
      plan: isExpired ? 'free' : selectedUser.plan
    }).eq('id', selectedUser.id).then(({ error }) => {
      if (error) {
        showToast('Erro ao salvar no banco: ' + error.message, 'error');
      } else {
        setUsers(prev => prev.map(u => {
          if (u.id !== selectedUser.id) return u;
          return {
            ...u,
            plan: isExpired ? 'free' as UserPlan : u.plan,
            subscription: {
              ...u.subscription,
              plan: isExpired ? 'free' as UserPlan : u.subscription.plan,
              endDate: newEnd,
              status: isExpired ? 'expired' as const : u.subscription.status,
              history: newHistory,
            },
            status: isExpired ? 'inactive' as const : u.status,
          };
        }));
        showToast(`-${removeDaysAmount} dias removidos de ${selectedUser.name}`, 'warning');
      }
    });

    setShowRemoveTimeModal(false);
    setRemoveDaysAmount(7);
    setRemoveNote('');
  };

  const handleUpgradeToPremium = () => {
    if (!selectedUser || upgradeDays <= 0) return;
    setUsers(prev => prev.map(u => {
      if (u.id !== selectedUser.id) return u;
      const start = todayStr();
      const end = addDays(start, upgradeDays);
      const newEntry: PlanHistoryEntry = {
        id: `h${Date.now()}`,
        plan: 'premium',
        origin: upgradeOrigin,
        startDate: start,
        endDate: end,
        durationDays: upgradeDays,
        addedBy: 'Admin',
        note: upgradeNote || `Upgrade para Premium — ${upgradeDays} dias (${upgradeOrigin === 'paid' ? 'pago' : 'cortesia'})`,
      };
      return {
        ...u,
        plan: 'premium' as UserPlan,
        status: 'active' as const,
        subscription: {
          plan: 'premium',
          status: 'active',
          startDate: start,
          endDate: end,
          origin: upgradeOrigin,
          history: [...u.subscription.history, newEntry],
        },
      };
    }));
    showToast(`${selectedUser.name} agora é Premium!`);
    setShowUpgradeModal(false);
    setUpgradeDays(30);
    setUpgradeNote('');
  };

  const handleDowngradeToFree = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const newEntry: PlanHistoryEntry = {
        id: `h${Date.now()}`,
        plan: 'free',
        origin: 'courtesy',
        startDate: todayStr(),
        endDate: '',
        durationDays: 0,
        addedBy: 'Admin',
        note: 'Rebaixado para plano gratuito',
      };
      return {
        ...u,
        plan: 'free' as UserPlan,
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: todayStr(),
          endDate: '',
          origin: 'courtesy',
          history: [...u.subscription.history, newEntry],
        },
      };
    }));
    const user = users.find(u => u.id === userId);
    showToast(`${user?.name} rebaixado para Free`, 'warning');
  };

  // ── Radix Modal Component ──
  const AdminModal: React.FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ isOpen, onOpenChange, title, icon, children }) => (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 z-50 w-full sm:max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
          style={{ maxHeight: '92dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-n-200">
            {icon}
            <Dialog.Title className="text-base font-bold flex-1 text-n-900">{title}</Dialog.Title>
            <Dialog.Close className="w-8 h-8 rounded-full flex items-center justify-center bg-n-100 hover:bg-n-200 transition-colors">
              <X size={15} className="text-n-600" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto flex-1 p-5 overscroll-contain">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  // ═══════════════════
  // USER DETAIL VIEW
  // ═══════════════════
  const renderUserDetail = () => {
    if (!selectedUser) return null;
    const sub = selectedUser.subscription;
    const remaining = sub.endDate ? daysRemaining(sub.endDate) : null;
    const isExpired = sub.endDate ? new Date(sub.endDate + 'T23:59:59') < new Date() : false;
    const paidEntries = sub.history.filter(h => h.origin === 'paid');
    const trialEntries = sub.history.filter(h => h.origin === 'trial');
    const courtesyEntries = sub.history.filter(h => h.origin === 'courtesy');

    return (
      <div className="animate-fade-in-up">
        {/* Back + Header */}
        <div className="page-header">
          <button onClick={() => setSelectedUserId(null)} className="flex items-center gap-2 text-sm font-semibold mb-3 transition-colors" style={{ color: 'var(--accent)' }}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--n-0)' }}>
              <span className="text-lg font-extrabold">{selectedUser.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-extrabold truncate" style={{ color: 'var(--n-900)' }}>{selectedUser.name}</h2>
              <p className="text-xs truncate" style={{ color: 'var(--n-500)' }}>{selectedUser.email}</p>
            </div>
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={selectedUser.plan === 'premium'
                ? { background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff' }
                : { background: 'var(--n-100)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
              {selectedUser.plan === 'premium' && <Crown size={11} />}
              {selectedUser.plan === 'premium' ? 'Premium' : 'Free'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Subscription Status Card */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--n-200)' }}>
            <div className="px-4 py-3" style={{
              background: selectedUser.plan === 'premium'
                ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                : 'var(--n-50)',
              borderBottom: '1px solid var(--n-200)'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {selectedUser.plan === 'premium' ? <Crown size={16} style={{ color: '#fff' }} /> : <CreditCard size={16} style={{ color: 'var(--n-500)' }} />}
                  <span className="text-sm font-bold" style={{ color: selectedUser.plan === 'premium' ? '#fff' : 'var(--n-900)' }}>
                    Plano {selectedUser.plan === 'premium' ? 'Premium' : 'Gratuito'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                  background: isExpired ? 'var(--error-light)' : (sub.status === 'active' ? 'rgba(255,255,255,0.2)' : 'var(--warning-light)'),
                  color: isExpired ? 'var(--error)' : (selectedUser.plan === 'premium' ? '#fff' : 'var(--success)'),
                }}>
                  {isExpired ? 'Expirado' : sub.status === 'active' ? 'Ativo' : 'Cancelado'}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3" style={{ background: 'var(--n-0)' }}>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar size={12} style={{ color: 'var(--n-400)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n-400)' }}>Início</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--n-900)' }}>{fmt(sub.startDate)}</span>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar size={12} style={{ color: 'var(--n-400)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n-400)' }}>Término</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: isExpired ? 'var(--error)' : 'var(--n-900)' }}>
                    {sub.endDate ? fmt(sub.endDate) : 'Indefinido'}
                  </span>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={12} style={{ color: 'var(--n-400)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n-400)' }}>Restante</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: remaining !== null && remaining <= 7 ? 'var(--error)' : 'var(--accent)' }}>
                    {remaining !== null ? `${remaining} dias` : '∞'}
                  </span>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {sub.origin === 'paid' ? <CreditCard size={12} style={{ color: 'var(--n-400)' }} /> : sub.origin === 'trial' ? <Clock size={12} style={{ color: 'var(--n-400)' }} /> : <Gift size={12} style={{ color: 'var(--n-400)' }} />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--n-400)' }}>Origem</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: sub.origin === 'paid' ? 'var(--success)' : sub.origin === 'trial' ? 'var(--accent)' : '#7c3aed' }}>
                    {sub.origin === 'paid' ? 'Pago' : sub.origin === 'trial' ? 'Trial' : 'Cortesia'}
                  </span>
                </div>
              </div>

              {/* Remaining bar */}
              {remaining !== null && selectedUser.plan === 'premium' && (
                <div>
                  <div className="flex justify-between text-[10px] font-semibold mb-1" style={{ color: 'var(--n-400)' }}>
                    <span>Tempo restante</span>
                    <span>{remaining} dias</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: 'var(--n-100)' }}>
                    <div className="h-2 rounded-full transition-all duration-500" style={{
                      width: `${Math.min(100, (remaining / 365) * 100)}%`,
                      background: remaining <= 7 ? 'var(--error)' : remaining <= 30 ? 'var(--warning)' : 'linear-gradient(90deg, #7c3aed, #6d28d9)',
                    }} />
                  </div>
                </div>
              )}

              {/* Extra info */}
              <div className="flex items-center justify-between text-xs py-2" style={{ borderTop: '1px solid var(--n-100)' }}>
                <span style={{ color: 'var(--n-500)' }}>Membro desde</span>
                <span className="font-semibold" style={{ color: 'var(--n-700)' }}>{fmtFull(selectedUser.joinDate)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--n-500)' }}>Clientes cadastrados</span>
                <span className="font-semibold" style={{ color: 'var(--n-700)' }}>{selectedUser.students}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setAddDaysAmount(30); setAddOrigin('paid'); setAddNote(''); setShowAddTimeModal(true); }}
              className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(22,163,74,0.15)' }}
            >
              <Plus size={16} /> Adicionar Tempo
            </button>
            <button
              onClick={() => { setRemoveDaysAmount(7); setRemoveNote(''); setShowRemoveTimeModal(true); }}
              className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid rgba(220,38,38,0.15)' }}
            >
              <Minus size={16} /> Remover Tempo
            </button>
            {selectedUser.plan === 'free' ? (
              <button
                onClick={() => { setUpgradeDays(30); setUpgradeOrigin('paid'); setUpgradeNote(''); setShowUpgradeModal(true); }}
                className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] col-span-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
              >
                <ArrowUpCircle size={16} /> Upgrade para Premium
              </button>
            ) : (
              <button
                onClick={() => handleDowngradeToFree(selectedUser.id)}
                className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] col-span-2"
                style={{ background: 'var(--n-100)', color: 'var(--n-600)', border: '1px solid var(--n-200)' }}
              >
                <Minus size={16} /> Rebaixar para Free
              </button>
            )}
          </div>

          {/* Plan History Summary */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--n-200)' }}>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors active:bg-black/[0.02]"
              style={{ background: 'var(--n-0)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-light)' }}>
                <History size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold" style={{ color: 'var(--n-900)' }}>Histórico de Planos</div>
                <div className="text-xs" style={{ color: 'var(--n-500)' }}>
                  {paidEntries.length} pago{paidEntries.length !== 1 ? 's' : ''} · {trialEntries.length} trial · {courtesyEntries.length} cortesia{courtesyEntries.length !== 1 ? 's' : ''}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--n-400)' }} className="flex-shrink-0" />
            </button>

            {/* Last 3 entries inline preview */}
            {sub.history.slice(-3).reverse().map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: '1px solid var(--n-100)', background: 'var(--n-0)' }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{
                  background: entry.origin === 'paid' ? 'var(--success-light)' : entry.origin === 'trial' ? 'var(--accent-light)' : '#f3e8ff',
                }}>
                  {entry.origin === 'paid'
                    ? <CreditCard size={11} style={{ color: 'var(--success)' }} />
                    : entry.origin === 'trial'
                    ? <Clock size={11} style={{ color: 'var(--accent)' }} />
                    : <Gift size={11} style={{ color: '#7c3aed' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block" style={{ color: 'var(--n-700)' }}>
                    {entry.note || `${entry.plan === 'premium' ? 'Premium' : 'Free'} — ${entry.durationDays}d`}
                  </span>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--n-400)' }}>{fmt(entry.startDate)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MODALS ── */}

        {/* Add Time Modal */}
        <AdminModal 
          isOpen={showAddTimeModal} 
          onOpenChange={setShowAddTimeModal}
          title="Adicionar Tempo"
          icon={<Plus size={18} style={{ color: 'var(--success)' }} />}
        >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--n-0)' }}>
                  <span className="text-sm font-bold">{selectedUser.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--n-900)' }}>{selectedUser.name}</div>
                  <div className="text-xs" style={{ color: 'var(--n-500)' }}>
                    Plano atual: {selectedUser.plan === 'premium' ? 'Premium' : 'Free'}
                    {sub.endDate && ` · Vence em ${fmt(sub.endDate)}`}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Dias a adicionar</label>
                <div className="flex gap-2">
                  {[7, 15, 30, 60, 90, 180, 365].map(d => (
                    <button key={d} onClick={() => setAddDaysAmount(d)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={addDaysAmount === d
                        ? { background: 'var(--accent)', color: 'var(--n-0)' }
                        : { background: 'var(--n-100)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={addDaysAmount || ''}
                  onChange={e => setAddDaysAmount(e.target.value === '' ? 0 : +e.target.value)}
                  min={1}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  className="input-base mt-2"
                />
              </div>

              <div>
                <label className="form-label">Tipo</label>
                <div className="flex gap-2">
                  <button onClick={() => setAddOrigin('paid')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={addOrigin === 'paid'
                      ? { background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }
                      : { background: 'var(--n-50)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                    <CreditCard size={14} /> Pago
                  </button>
                  <button onClick={() => setAddOrigin('courtesy')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={addOrigin === 'courtesy'
                      ? { background: '#f3e8ff', color: '#7c3aed', border: '1px solid #7c3aed' }
                      : { background: 'var(--n-50)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                    <Gift size={14} /> Cortesia
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Observação (opcional)</label>
                <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)}
                  className="input-base" placeholder="Ex: Renovação mensal" />
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(22,163,74,0.15)' }}>
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <Check size={13} /> Resultado
                </div>
                Nova data de término: <strong>{fmt(addDays(sub.endDate && new Date(sub.endDate) > new Date() ? sub.endDate : todayStr(), addDaysAmount))}</strong>
              </div>

              <button onClick={handleAddTime} className="btn btn-primary w-full">
                <Plus size={16} /> Confirmar +{addDaysAmount} dias
              </button>
            </div>
          </AdminModal>

        {/* Remove Time Modal */}
        <AdminModal
          isOpen={showRemoveTimeModal}
          onOpenChange={setShowRemoveTimeModal}
          title="Remover Tempo"
          icon={<Minus size={18} style={{ color: 'var(--error)' }} />}
        >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--n-0)' }}>
                  <span className="text-sm font-bold">{selectedUser.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--n-900)' }}>{selectedUser.name}</div>
                  <div className="text-xs" style={{ color: 'var(--n-500)' }}>
                    Vence em: {sub.endDate ? fmt(sub.endDate) : 'Indefinido'}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Dias a remover</label>
                <div className="flex gap-2">
                  {[7, 15, 30].map(d => (
                    <button key={d} onClick={() => setRemoveDaysAmount(d)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={removeDaysAmount === d
                        ? { background: 'var(--error)', color: 'var(--n-0)' }
                        : { background: 'var(--n-100)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={removeDaysAmount || ''}
                  onChange={e => setRemoveDaysAmount(e.target.value === '' ? 0 : +e.target.value)}
                  min={1}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  className="input-base mt-2"
                />
              </div>

              <div>
                <label className="form-label">Motivo (opcional)</label>
                <input type="text" value={removeNote} onChange={e => setRemoveNote(e.target.value)}
                  className="input-base" placeholder="Ex: Estorno, ajuste" />
              </div>

              {(() => {
                const newEnd = sub.endDate ? addDays(sub.endDate, -removeDaysAmount) : '';
                const willExpire = newEnd ? new Date(newEnd) <= new Date() : false;
                return (
                  <div className="p-3 rounded-xl text-xs" style={{
                    background: willExpire ? 'var(--error-light)' : 'var(--warning-light)',
                    color: willExpire ? 'var(--error)' : 'var(--warning)',
                    border: willExpire ? '1px solid rgba(220,38,38,0.15)' : '1px solid rgba(217,119,6,0.15)',
                  }}>
                    <div className="flex items-center gap-1.5 font-semibold mb-1">
                      <AlertTriangle size={13} /> {willExpire ? 'Atenção!' : 'Resultado'}
                    </div>
                    {willExpire
                      ? <>O plano será <strong>expirado</strong> e o usuário será rebaixado para Free.</>
                      : <>Nova data de término: <strong>{fmt(newEnd)}</strong></>}
                  </div>
                );
              })()}

              <button onClick={handleRemoveTime} className="btn btn-danger w-full">
                <Minus size={16} /> Confirmar -{removeDaysAmount} dias
              </button>
            </div>
          </AdminModal>

        {/* Upgrade Modal */}
        <AdminModal
          isOpen={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          title="Upgrade para Premium"
          icon={<ArrowUpCircle size={18} style={{ color: '#7c3aed' }} />}
        >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f3e8ff', border: '1px solid #e9d5ff' }}>
                <Crown size={20} style={{ color: '#7c3aed' }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: '#7c3aed' }}>Ativar Premium para {selectedUser.name}</div>
                  <div className="text-xs" style={{ color: '#8b5cf6' }}>Todos os recursos serão desbloqueados</div>
                </div>
              </div>

              <div>
                <label className="form-label">Duração (dias)</label>
                <div className="flex gap-2 flex-wrap">
                  {[7, 15, 30, 60, 90, 180, 365].map(d => (
                    <button key={d} onClick={() => setUpgradeDays(d)}
                      className="py-2 px-3 rounded-lg text-xs font-semibold transition-all"
                      style={upgradeDays === d
                        ? { background: '#7c3aed', color: '#fff' }
                        : { background: 'var(--n-100)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={upgradeDays || ''}
                  onChange={e => setUpgradeDays(e.target.value === '' ? 0 : +e.target.value)}
                  min={1}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  className="input-base mt-2"
                />
              </div>

              <div>
                <label className="form-label">Tipo</label>
                <div className="flex gap-2">
                  <button onClick={() => setUpgradeOrigin('paid')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={upgradeOrigin === 'paid'
                      ? { background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }
                      : { background: 'var(--n-50)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                    <CreditCard size={14} /> Pago
                  </button>
                  <button onClick={() => setUpgradeOrigin('courtesy')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={upgradeOrigin === 'courtesy'
                      ? { background: '#f3e8ff', color: '#7c3aed', border: '1px solid #7c3aed' }
                      : { background: 'var(--n-50)', color: 'var(--n-500)', border: '1px solid var(--n-200)' }}>
                    <Gift size={14} /> Cortesia
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Observação (opcional)</label>
                <input type="text" value={upgradeNote} onChange={e => setUpgradeNote(e.target.value)}
                  className="input-base" placeholder="Ex: Promoção de lançamento" />
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <Crown size={13} /> Plano Premium
                </div>
                Período: {fmt(todayStr())} até <strong>{fmt(addDays(todayStr(), upgradeDays))}</strong> ({upgradeDays} dias)
              </div>

              <button onClick={handleUpgradeToPremium}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                <Crown size={16} className="inline mr-2" /> Ativar Premium
              </button>
            </div>
          </AdminModal>

        {/* History Modal */}
        <AdminModal
          isOpen={showHistoryModal}
          onOpenChange={setShowHistoryModal}
          title="Histórico de Planos"
          icon={<History size={18} style={{ color: 'var(--accent)' }} />}
        >
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--success-light)', border: '1px solid rgba(22,163,74,0.15)' }}>
                <div className="text-lg font-extrabold" style={{ color: 'var(--success)' }}>{paidEntries.length}</div>
                <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--success)' }}>Pagos</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: '#f3e8ff', border: '1px solid #e9d5ff' }}>
                <div className="text-lg font-extrabold" style={{ color: '#7c3aed' }}>{courtesyEntries.length}</div>
                <div className="text-[10px] font-semibold uppercase" style={{ color: '#7c3aed' }}>Cortesias</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-0">
              {[...sub.history].reverse().map((entry, i) => (
                <div key={entry.id} className="flex gap-3 relative">
                  {/* Timeline line */}
                  {i < sub.history.length - 1 && (
                    <div className="absolute left-[13px] top-[28px] bottom-0 w-px" style={{ background: 'var(--n-200)' }} />
                  )}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 relative z-10" style={{
                    background: entry.origin === 'paid' ? 'var(--success-light)' : '#f3e8ff',
                    border: entry.origin === 'paid' ? '2px solid var(--success)' : '2px solid #7c3aed',
                  }}>
                    {entry.origin === 'paid'
                      ? <CreditCard size={11} style={{ color: 'var(--success)' }} />
                      : <Gift size={11} style={{ color: '#7c3aed' }} />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--n-900)' }}>
                          {entry.plan === 'premium' ? 'Premium' : 'Free'}
                          <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{
                            background: entry.origin === 'paid' ? 'var(--success-light)' : '#f3e8ff',
                            color: entry.origin === 'paid' ? 'var(--success)' : '#7c3aed',
                          }}>
                            {entry.origin === 'paid' ? 'Pago' : 'Cortesia'}
                          </span>
                        </div>
                        {entry.note && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--n-500)' }}>{entry.note}</div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--n-400)' }}>
                        {entry.durationDays > 0 ? `${entry.durationDays}d` : entry.durationDays < 0 ? `${entry.durationDays}d` : '—'}
                      </span>
                    </div>
                    <div className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--n-400)' }}>
                      <Calendar size={9} />
                      {fmt(entry.startDate)} → {entry.endDate ? fmt(entry.endDate) : '∞'}
                      <span className="ml-1">· por {entry.addedBy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminModal>
      </div>
    );
  };

  // ═══════════════════
  // USER LIST VIEW
  // ═══════════════════
  const renderUserList = () => (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'var(--accent-light)' }}>
            <Shield size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold" style={{ color: 'var(--n-900)' }}>Painel Admin</h1>
            <p className="text-xs" style={{ color: 'var(--n-500)' }}>Gestão de clientes e assinaturas</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'var(--accent)' },
            { label: 'Premium', value: stats.premium, color: '#7c3aed' },
            { label: 'Free', value: stats.free, color: 'var(--n-500)' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)' }}>
              <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-semibold" style={{ color: 'var(--n-500)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Paid vs Courtesy Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-lg p-3" style={{ background: 'var(--success-light)', border: '1px solid rgba(22,163,74,0.12)' }}>
            <CreditCard size={16} style={{ color: 'var(--success)' }} />
            <div>
              <div className="text-base font-extrabold" style={{ color: 'var(--success)' }}>{stats.paidPlans}</div>
              <div className="text-[10px] font-semibold" style={{ color: 'var(--success)' }}>Planos Pagos</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg p-3" style={{ background: '#f3e8ff', border: '1px solid #e9d5ff' }}>
            <Gift size={16} style={{ color: '#7c3aed' }} />
            <div>
              <div className="text-base font-extrabold" style={{ color: '#7c3aed' }}>{stats.courtesyPlans}</div>
              <div className="text-[10px] font-semibold" style={{ color: '#7c3aed' }}>Cortesias</div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--n-400)' }} />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base w-full pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as any)} className="input-base text-sm flex-1">
              <option value="all">Todos os planos</option>
              <option value="free">Gratuito</option>
              <option value="premium">Premium</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input-base text-sm flex-1">
              <option value="all">Todos status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        {/* User Cards */}
        <div className="space-y-2">
          {filteredUsers.length === 0 && (
            <div className="empty-state py-10">
              <Users className="empty-state-icon" />
              <div className="empty-state-title">Nenhum usuário encontrado</div>
              <div className="empty-state-description">Tente ajustar os filtros de busca</div>
            </div>
          )}
          {filteredUsers.map((user) => {
            const remaining = user.subscription.endDate ? daysRemaining(user.subscription.endDate) : null;
            const isExpiring = remaining !== null && remaining <= 7 && remaining > 0;
            const isExpired = user.subscription.endDate ? new Date(user.subscription.endDate + 'T23:59:59') < new Date() : false;
            return (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
                style={{ background: 'var(--n-0)', border: '1px solid var(--n-200)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: user.plan === 'premium' ? '#7c3aed' : 'var(--accent)', color: 'var(--n-0)' }}>
                  <span className="text-sm font-bold">{user.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--n-900)' }}>{user.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                      style={user.plan === 'premium' ? { background: '#f3e8ff', color: '#7c3aed' } : { background: 'var(--n-100)', color: 'var(--n-500)' }}>
                      {user.plan === 'premium' ? 'Premium' : 'Free'}
                    </span>
                    {isExpiring && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                        style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                        {remaining}d
                      </span>
                    )}
                    {isExpired && user.plan === 'premium' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                        style={{ background: 'var(--error-light)', color: 'var(--error)' }}>
                        Expirado
                      </span>
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--n-500)' }}>
                    {user.email} · {user.students} clientes
                    {user.subscription.endDate && ` · ${user.subscription.origin === 'paid' ? '💳' : '🎁'} até ${fmt(user.subscription.endDate)}`}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--n-400)' }} className="flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ═══════════════════
  // MAIN RENDER
  // ═══════════════════
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--n-50)' }}>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--n-500)' }}>Carregando treinadores...</p>
        </div>
      ) : (
        selectedUserId ? renderUserDetail() : renderUserList()
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center" style={{ animation: 'slideInUp 250ms ease-out' }}>
          <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning'} max-w-sm w-full`}>
            {toast.type === 'success' ? <Check size={16} style={{ color: 'var(--success)' }} /> :
             toast.type === 'warning' ? <AlertTriangle size={16} style={{ color: 'var(--warning)' }} /> :
             <X size={16} style={{ color: 'var(--error)' }} />}
            <span className="text-sm font-medium" style={{ color: 'var(--n-900)' }}>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
