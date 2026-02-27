import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Search, Phone, Calendar, DollarSign, Check, X, Trash2, Users, Crown, Lock, Copy, CalendarDays, Share2, Link2 } from 'lucide-react';
import { Student } from '../types';
import { useToast } from '../hooks/useToast';
import { useFormValidation, commonValidations } from '../hooks/useFormValidation';
import { usePhoneMask } from '../hooks/usePhoneMask';
import { usePermissions } from '../hooks/usePermissions';
import { useStudents } from '../hooks/useStudents';
import PricingPlans from '../components/PricingPlans';
import { addDays, startOfWeek, format } from 'date-fns';

const Students: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent, generateShareToken } = useStudents();
  const [sharingId, setSharingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'monthly' | 'session'>('all');
  const [saving, setSaving] = useState(false);
  const [modalTab, setModalTab] = useState<'data' | 'access'>('data');
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    phone: '',
    plan: 'monthly',
    value: 0,
    weeklyFrequency: 1,
    selectedDays: [],
    selectedTimes: [],
    isConsulting: false,
    isActive: true,
    billingDay: 1,
  });

  const [showWeekPreview, setShowWeekPreview] = useState(false);
  const { success, error, warning } = useToast();
  const { validateForm, hasErrors } = useFormValidation();
  const phoneMask = usePhoneMask(formData.phone || '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { canAddStudent, maxStudents } = usePermissions();
  const [showPricing, setShowPricing] = useState(false);
  const activeStudents = students.filter(s => s.isActive);
  const atLimit = !canAddStudent(activeStudents.length);

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const timeSlots = Array.from({ length: 15 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);
  const DAY_MAP: Record<string, number> = {
    'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3,
    'Quinta': 4, 'Sexta': 5, 'Sábado': 6,
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' ? student.isActive : !student.isActive);
      const matchesPlan = filterPlan === 'all' || student.plan === filterPlan;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [students, searchTerm, filterStatus, filterPlan]);

  const activeCount = students.filter(s => s.isActive).length;
  const monthlyRevenue = students.filter(s => s.isActive && s.plan === 'monthly').reduce((acc, s) => acc + s.value, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation rules
    const validationRules: any = {
      name: commonValidations.name,
      phone: commonValidations.phone,
      value: commonValidations.value,
    };

    if (!formData.isConsulting) {
      validationRules.weeklyFrequency = commonValidations.weeklyFrequency;
    }

    // Validate form
    const errors = validateForm(
      {
        name: formData.name || '',
        phone: phoneMask.getCleanPhone(),
        value: String(formData.value || 0),
        weeklyFrequency: String(formData.weeklyFrequency || 1),
      },
      validationRules
    );

    if (hasErrors(errors)) {
      setFormErrors(errors);
      error('Por favor, corrija os erros no formulário');
      return;
    }

    setSaving(true);

    try {
      const studentData = {
        name: formData.name || '',
        phone: phoneMask.getCleanPhone(),
        plan: formData.plan as any,
        value: formData.value || 0,
        weeklyFrequency: formData.weeklyFrequency || 1,
        selectedDays: formData.selectedDays || [],
        selectedTimes: formData.selectedTimes || [],
        isConsulting: formData.isConsulting || false,
        isActive: formData.isActive !== false,
        billingDay: formData.plan === 'monthly' ? (Number(formData.billingDay) || 1) : null,
        planDuration: formData.plan === 'long_term' 
          ? ((formData as any).planDuration === 0 ? ((formData as any).customMonths || 1) : ((formData as any).planDuration || 3)) 
          : null,
        totalValue: formData.plan === 'long_term' ? ((formData as any).totalValue || 0) : null,
        nextBillingDate: formData.plan === 'long_term' ? ((formData as any).nextBillingDate || null) : null,
      };

      if (editingStudent) {
        await updateStudent(editingStudent.id, studentData);
        success('Aluno atualizado com sucesso!');
      } else {
        await addStudent(studentData);
        success('Aluno cadastrado com sucesso!');
      }

      setShowForm(false);
      setEditingStudent(null);
      setFormErrors({});
      resetForm();
    } catch (err: any) {
      console.error('[handleSubmit] Erro ao salvar aluno:', err);
      error(err.message || 'Erro ao salvar aluno');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      plan: 'monthly',
      value: 0,
      weeklyFrequency: 1,
      selectedDays: [],
      selectedTimes: [],
      isConsulting: false,
      isActive: true,
      billingDay: 1,
    });
    setModalTab('data');
    phoneMask.setValue('');
  };

  const handleEdit = useCallback((student: Student) => {
    setEditingStudent(student);
    setFormData(student);
    phoneMask.setValue(student.phone);
    setShowForm(true);
  }, [phoneMask]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      try {
        await deleteStudent(id);
        success('Aluno excluído com sucesso!');
      } catch (err: any) {
        error(err.message || 'Erro ao excluir aluno');
      }
    }
  }, [deleteStudent, success, error]);

  const toggleStudentStatus = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const newStatus = !student.isActive;
    try {
      await updateStudent(id, { isActive: newStatus });
      warning(newStatus ? 'Aluno ativado com sucesso!' : 'Aluno desativado!');
    } catch (err: any) {
      error(err.message || 'Erro ao alterar status');
    }
  };

  const handleDaySelection = (day: string) => {
    const isSelected = formData.selectedDays?.includes(day);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        selectedDays: prev.selectedDays?.filter(d => d !== day) || [],
        selectedTimes: prev.selectedTimes?.filter((_, i) => 
          prev.selectedDays?.[i] !== day
        ) || []
      }));
    } else {
      const atDayLimit = (formData.selectedDays?.length || 0) >= (formData.weeklyFrequency || 1);
      if (atDayLimit) return;
      setFormData(prev => ({
        ...prev,
        selectedDays: [...(prev.selectedDays || []), day],
        selectedTimes: [...(prev.selectedTimes || []), '08:00']
      }));
    }
  };

  const handleFrequencyChange = (newFreq: number) => {
    setFormData(prev => {
      const currentDays = prev.selectedDays || [];
      const currentTimes = prev.selectedTimes || [];
      if (newFreq < currentDays.length) {
        return {
          ...prev,
          weeklyFrequency: newFreq,
          selectedDays: currentDays.slice(0, newFreq),
          selectedTimes: currentTimes.slice(0, newFreq),
        };
      }
      return { ...prev, weeklyFrequency: newFreq };
    });
    setShowWeekPreview(false);
  };

  const copyTimeToAll = () => {
    setFormData(prev => {
      const firstTime = prev.selectedTimes?.[0] || '08:00';
      const newTimes = (prev.selectedDays || []).map(() => firstTime);
      return { ...prev, selectedTimes: newTimes };
    });
    success('Horário copiado para todos os dias!');
  };

  const generateWeekPreview = () => {
    const days = formData.selectedDays || [];
    const times = formData.selectedTimes || [];
    const today = new Date();
    const mondayThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const weeks: { dayShort: string; dateStr: string; time: string }[][] = [];
    for (let w = 0; w < 4; w++) {
      const weekMonday = addDays(mondayThisWeek, w * 7);
      const weekItems: { dayShort: string; dateStr: string; time: string }[] = [];
      days.forEach((day, idx) => {
        const jsDay = DAY_MAP[day];
        let offset = jsDay - 1;
        if (offset < 0) offset = 6;
        const date = addDays(weekMonday, offset);
        weekItems.push({
          dayShort: day.slice(0, 3),
          dateStr: format(date, 'dd/MM'),
          time: times[idx] || '08:00',
        });
      });
      weeks.push(weekItems);
    }
    return weeks;
  };

  const handleTimeChange = (dayIndex: number, time: string) => {
    setFormData(prev => {
      const newTimes = [...(prev.selectedTimes || [])];
      newTimes[dayIndex] = time;
      return { ...prev, selectedTimes: newTimes };
    });
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight" style={{color:'var(--n-900)'}}>Clientes</h1>
            <p className="text-xs mt-0.5" style={{color:'var(--n-900)'}}>{activeCount} ativos · {students.length} cadastrados</p>
          </div>
          <button
            onClick={() => atLimit ? setShowPricing(true) : setShowForm(true)}
            className="btn btn-primary text-sm px-3.5 py-2"
          >
            {atLimit ? <Lock size={15} /> : <Plus size={15} />}
            <span>Novo</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: students.length, color: 'var(--accent)' },
            { label: 'Ativos', value: activeCount, color: 'var(--success)' },
            { label: 'Receita', value: `R$${monthlyRevenue}`, color: '#8b5cf6' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2.5 text-center" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
              <div className="text-base font-extrabold" style={{color:s.color}}>{s.value}</div>
              <div className="text-xs" style={{color:'var(--n-900)'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5">
      {/* Student limit banner */}
      {atLimit && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-4" style={{background:'var(--warning-light)',border:'1px solid var(--warning)'}}>
          <div className="flex items-center gap-2.5 min-w-0">
            <Crown size={16} style={{color:'var(--warning)'}} className="flex-shrink-0" />
            <p className="text-xs font-medium" style={{color:'var(--n-900)'}}>
              Limite de {maxStudents} clientes atingido no plano gratuito
            </p>
          </div>
          <button
            onClick={() => setShowPricing(true)}
            className="btn btn-primary flex-shrink-0 text-xs px-3 py-1.5"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{color:'var(--n-800)'}} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10"
            aria-label="Buscar clientes por nome ou telefone"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg p-0.5 flex-1 min-w-0" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}>
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-1 px-2 py-2 rounded-md text-xs font-semibold transition-all touch-manipulation ${
                  filterStatus === s ? 'bg-white shadow-sm' : ''
                }`}
                style={{color: filterStatus === s ? 'var(--accent)' : 'var(--n-800)'}}
              >
                {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value as 'all' | 'monthly' | 'session')}
            className="input-base text-xs flex-shrink-0"
            style={{width:'auto',minWidth:'120px',padding:'0.5rem 0.75rem'}}
          >
            <option value="all">Todos planos</option>
            <option value="monthly">Mensal</option>
            <option value="session">Sessão</option>
          </select>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}>
              <Users size={24} style={{color:'var(--n-800)'}} />
            </div>
            <p className="text-sm font-bold" style={{color:'var(--n-900)'}}>Nenhum cliente encontrado</p>
            <p className="text-xs mt-1" style={{color:'var(--n-800)'}}>Tente ajustar os filtros</p>
          </div>
        )}
        {filteredStudents.map((student) => {
          const initials = student.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

          return (
          <button
            key={student.id}
            onClick={() => handleEdit(student)}
            className={`w-full text-left rounded-xl p-4 transition-all duration-200 active:scale-[0.99] hover:shadow-md cursor-pointer ${
              student.isActive ? 'opacity-100' : 'opacity-50'
            }`}
            style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
                style={{background:'var(--accent-light)', color:'var(--accent)', border:'1.5px solid var(--accent)'}}
              >
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-bold truncate" style={{color:'var(--n-900)'}}>
                        {student.name}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{color: student.isActive ? 'var(--success)' : 'var(--error)', background: student.isActive ? 'var(--success-light)' : 'var(--error-light)'}}>
                        {student.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      {student.isConsulting && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" 
                          style={{background:'#fef3c7',color:'#92400e',border:'1.5px solid #fcd34d'}}>
                          Consultoria
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          color: student.plan === 'monthly' ? 'var(--accent)' : student.plan === 'long_term' ? '#8b5cf6' : 'var(--n-600)', 
                          background: student.plan === 'monthly' ? 'var(--accent-light)' : student.plan === 'long_term' ? 'rgba(139,92,246,0.1)' : 'var(--n-100)'
                        }}>
                        {student.plan === 'monthly' ? 'Mensal' : student.plan === 'long_term' ? 'Pagamento antecipado' : 'Sessão'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSharingId(student.id);
                        try {
                          const token = await generateShareToken(student.id);
                          const link = `${window.location.origin}/s/${token}`;
                          await navigator.clipboard.writeText(link);
                          alert(`Link copiado!\n\n${link}`);
                        } catch {
                          alert('Não foi possível gerar o link. Verifique se a coluna share_token existe no banco.');
                        } finally {
                          setSharingId(null);
                        }
                      }}
                      className="p-1.5 rounded-lg transition-all touch-manipulation hover:bg-blue-500/10"
                      title="Compartilhar link de evolução"
                      style={{ color: sharingId === student.id ? 'var(--accent)' : 'var(--n-800)' }}
                      role="button"
                      aria-label={`Compartilhar evolução de ${student.name}`}
                    >
                      {sharingId === student.id ? <Link2 size={14} /> : <Share2 size={14} />}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }} 
                      className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all touch-manipulation" 
                      title="Excluir"
                      role="button"
                      aria-label={`Excluir aluno ${student.name}`}
                    >
                      <Trash2 size={14} />
                    </span>
                    <span 
                      onClick={(e) => { e.stopPropagation(); toggleStudentStatus(student.id); }} 
                      className={`p-1.5 rounded-lg transition-all touch-manipulation ${student.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`} 
                      title={student.isActive ? 'Desativar' : 'Ativar'}
                      role="button"
                      aria-label={`${student.isActive ? 'Desativar' : 'Ativar'} aluno ${student.name}`}
                    >
                      {student.isActive ? <Check size={14} /> : <X size={14} />}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs mt-2">
                  <div className="flex items-center gap-1" style={{color:'var(--n-900)'}}>
                    <Phone size={11} style={{color:'var(--accent)'}} className="flex-shrink-0" />
                    <span className="truncate">{student.phone}</span>
                  </div>
                  <div className="flex items-center gap-1" style={{color:'var(--n-900)'}}>
                    <DollarSign size={11} style={{color:'var(--success)'}} className="flex-shrink-0" />
                    <span className="font-semibold flex items-center gap-1.5" style={{color:'var(--n-900)'}}>
                      {student.value === 0 ? (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-emerald-100 text-emerald-700 font-bold uppercase tracking-tighter text-[9px]">
                          Cortesia
                        </span>
                      ) : (
                        student.plan === 'long_term' ? `R$ ${student.totalValue} (Total)` : `R$ ${student.value}`
                      )}
                    </span>
                  </div>
                  {!student.isConsulting && (
                    <>
                      <div className="flex items-center gap-1" style={{color:'var(--n-900)'}}>
                        <Calendar size={11} style={{color:'#8b5cf6'}} className="flex-shrink-0" />
                        <span>{student.weeklyFrequency}x/sem</span>
                      </div>
                      <div className="truncate text-xs" style={{color:'var(--n-800)'}}>
                        {student.selectedDays.join(', ') || '—'}
                      </div>
                      {student.plan === 'long_term' && student.nextBillingDate && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-medium text-purple-600">
                          <Calendar size={10} />
                          Prox. Cobrança: {new Date(student.nextBillingDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]" style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}>
          <div className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{background:'var(--n-0)',border:'1px solid var(--n-200)',boxShadow:'var(--sh-lg)'}}>
            <div className="sticky top-0 px-5 pt-5 z-10 rounded-t-2xl sm:rounded-t-2xl" style={{background:'var(--n-0)'}}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold" style={{color:'var(--n-900)'}}>
                  {editingStudent ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingStudent(null); }}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors touch-manipulation"
                >
                  <X size={20} style={{color:'var(--n-800)'}} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 border-b" style={{borderColor:'var(--n-200)'}}>
                <button
                  type="button"
                  onClick={() => setModalTab('data')}
                  className={`pb-3 text-xs font-bold transition-all relative ${modalTab === 'data' ? '' : 'opacity-70'}`}
                  style={{color: modalTab === 'data' ? 'var(--accent)' : 'var(--n-900)'}}
                >
                  Dados do Cliente
                  {modalTab === 'data' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{background:'var(--accent)'}} />}
                </button>
                {editingStudent && (
                  <button
                    type="button"
                    onClick={() => setModalTab('access')}
                    className={`pb-3 text-xs font-bold transition-all relative ${modalTab === 'access' ? '' : 'opacity-70'}`}
                    style={{color: modalTab === 'access' ? 'var(--accent)' : 'var(--n-900)'}}
                  >
                    Link de Acesso
                    {modalTab === 'access' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{background:'var(--accent)'}} />}
                  </button>
                )}
              </div>
            </div>

            {modalTab === 'data' ? (
              <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-4">
              {/* Nome + Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Nome completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                    className="input-base"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Telefone</label>
                  <input
                    type="tel"
                    required
                    value={phoneMask.value}
                    onChange={(e) => {
                      phoneMask.setValue(e.target.value);
                      setFormData(prev => ({ ...prev, phone: e.target.value }));
                    }}
                    placeholder="(11) 99999-9999"
                    className="input-base"
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>
                  )}
                </div>
                {formData.plan === 'monthly' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Dia vencimento</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={formData.billingDay || ''}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData(prev => ({ ...prev, billingDay: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      className="input-base"
                    />
                  </div>
                )}
              </div>

              {/* Toggles (Consultoria + Ativo) moved up for better UX */}
              <div className="flex flex-wrap gap-4 py-2 border-y" style={{borderColor:'var(--n-100)', background:'var(--n-50)'}}>
                <div className="px-5 flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.isConsulting}
                        onChange={(e) => setFormData(prev => ({ ...prev, isConsulting: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${formData.isConsulting ? 'bg-blue-600' : 'bg-gray-300'}`} />
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isConsulting ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold" style={{color:'var(--n-900)'}}>Consultoria Online</span>
                      <span className="text-[10px]" style={{color:'var(--n-900)'}}>Habilita recursos de consultoria</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-5 h-5 rounded accent-blue-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-extrabold" style={{color:'var(--n-900)'}}>Cliente Ativo</span>
                      <span className="text-[10px]" style={{color:'var(--n-900)'}}>Visível na listagem</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Plano + Valor + Frequência + Vencimento */}
              <div className={`grid gap-3 ${formData.plan === 'monthly' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Plano</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value as any }))}
                    className="input-base"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="session">Sessão</option>
                    <option value="long_term">Pagamento antecipado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>
                    {formData.plan === 'long_term' ? 'Valor Total (R$)' : 'Valor (R$)'}
                  </label>
                  <input
                    type="number"
                    value={formData.plan === 'long_term' ? (formData as any).totalValue || '' : formData.value === 0 ? '0' : formData.value || ''}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      if (formData.plan === 'long_term') {
                        setFormData(prev => ({ ...prev, totalValue: val } as any));
                      } else {
                        setFormData(prev => ({ ...prev, value: val }));
                      }
                    }}
                    className="input-base"
                  />
                  {formErrors.value && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.value}</p>
                  )}
                </div>
                {!formData.isConsulting && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Vezes na semana</label>
                    <select
                      required
                      value={formData.weeklyFrequency}
                      onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                      className="input-base"
                    >
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n}x por semana</option>
                      ))}
                    </select>
                    {formErrors.weeklyFrequency && (
                      <p className="text-xs text-red-400 mt-1">{formErrors.weeklyFrequency}</p>
                    )}
                  </div>
                )}

                {formData.plan === 'long_term' && (
                  <>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Duração do Plano</label>
                        <div className="flex gap-2">
                          <select
                            value={(formData as any).planDuration || 0}
                            onChange={(e) => setFormData({ ...formData, planDuration: Number(e.target.value) } as any)}
                            className="input-base flex-1"
                          >
                            <option value={3}>3 meses</option>
                            <option value={6}>6 meses</option>
                            <option value={8}>8 meses</option>
                            <option value={12}>12 meses</option>
                            <option value={15}>15 meses</option>
                            <option value={0}>Personalizado</option>
                          </select>
                          {(formData as any).planDuration === 0 && (
                            <input
                              type="number"
                              placeholder="Qtd meses"
                              value={(formData as any).customMonths || ''}
                              onChange={(e) => setFormData({ ...formData, customMonths: Number(e.target.value) } as any)}
                              className="input-base w-24"
                              min="1"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{color:'var(--n-800)'}}>Próxima Cobrança</label>
                      <input
                        type="date"
                        required
                        value={(formData as any).nextBillingDate || ''}
                        onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value } as any)}
                        className="input-base"
                      />
                    </div>
                  </>
                )}
              </div>


              {/* Dias e horários */}
              {!formData.isConsulting && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{color:'var(--n-800)'}}>
                      Dias e horários
                    </label>
                    {(formData.selectedDays?.length || 0) > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:'var(--accent-light)',color:'var(--accent)'}}>
                        {formData.selectedDays?.length} de {formData.weeklyFrequency} {formData.weeklyFrequency === 1 ? 'dia' : 'dias'}
                      </span>
                    )}
                  </div>

                  {/* Day chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {weekDays.map((day) => {
                      const isSelected = formData.selectedDays?.includes(day) || false;
                      const atDayLimit = (formData.selectedDays?.length || 0) >= (formData.weeklyFrequency || 1);
                      const isDisabled = !isSelected && atDayLimit;
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDaySelection(day)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 touch-manipulation ${
                            isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'
                          }`}
                          style={isSelected
                            ? {background:'var(--accent)',color:'#fff',border:'1.5px solid var(--accent)'}
                            : {background:'var(--n-100)',color:'var(--n-800)',border:'1.5px solid var(--n-200)'}
                          }
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Time slots for selected days */}
                  {(formData.selectedDays?.length || 0) > 0 && (
                    <div className="space-y-2">
                      {formData.selectedDays?.map((day, idx) => (
                        <div key={day} className="flex items-center gap-3 p-2.5 rounded-lg" style={{background:'var(--n-50)',border:'1px solid var(--n-200)'}}>
                           <span className="text-sm font-semibold min-w-[80px]" style={{color:'var(--n-800)'}}>{day}</span>
                          <select
                            value={formData.selectedTimes?.[idx] || '08:00'}
                            onChange={(e) => handleTimeChange(idx, e.target.value)}
                            className="input-base px-3 py-1.5 text-sm flex-1"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                      ))}

                      {/* Copy time to all */}
                      {(formData.selectedDays?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={copyTimeToAll}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-150 touch-manipulation w-full justify-center hover:scale-[1.01]"
                          style={{background:'var(--accent-light)',color:'var(--accent)',border:'1.5px solid var(--accent)'}}
                        >
                          <Copy size={12} />
                          Copiar horário de {formData.selectedDays?.[0]?.slice(0, 3)} para todos
                        </button>
                      )}

                      {/* Repeat 4 weeks preview */}
                      <button
                        type="button"
                        onClick={() => setShowWeekPreview(prev => !prev)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-150 touch-manipulation w-full justify-center mt-1 hover:scale-[1.01]"
                        style={{background:'var(--n-100)',color:'var(--n-800)',border:'1px solid var(--n-200)'}}
                      >
                        <CalendarDays size={12} />
                        {showWeekPreview ? 'Ocultar preview' : 'Repetir por 4 semanas — ver datas'}
                      </button>

                      {showWeekPreview && (
                        <div className="rounded-xl p-3 space-y-3 animate-fade-in-up" style={{background:'var(--n-50)',border:'1px solid var(--n-200)'}}>
                          <p className="text-xs font-bold" style={{color:'var(--n-800)'}}>
                            Preview das próximas 4 semanas
                          </p>
                          {generateWeekPreview().map((week, wIdx) => (
                            <div key={wIdx}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'var(--accent)'}}>
                                Semana {wIdx + 1}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {week.map((item, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="text-[11px] px-2 py-1 rounded-md font-medium"
                                    style={{background:'var(--n-0)',border:'1px solid var(--n-200)',color:'var(--n-800)'}}
                                  >
                                    {item.dayShort} {item.dateStr} · {item.time}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          <p className="text-[10px] mt-1" style={{color:'var(--n-800)'}}>
                            Os horários se repetem automaticamente toda semana na agenda.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
                <div className="flex gap-3 pt-2 pb-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingStudent(null); }}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all touch-manipulation"
                    style={{border:'1px solid var(--n-200)',color:'var(--n-800)'}}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary flex-1 py-2.5 text-sm font-bold disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : editingStudent ? 'Salvar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-5 sm:px-6 py-8 space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'var(--accent-light)'}}>
                    <Share2 size={28} style={{color:'var(--accent)'}} />
                  </div>
                  <h3 className="text-base font-bold" style={{color:'var(--n-900)'}}>Portal de Evolução</h3>
                  <p className="text-xs max-w-[240px] mx-auto" style={{color:'var(--n-900)'}}>
                    Envie o link abaixo para o aluno acompanhar as fotos, medidas e bioimpedância.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Link Completo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{color:'var(--n-900)'}}>Link do Aluno</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{background:'var(--n-50)', border:'1px solid var(--n-200)'}}>
                      <div className="flex-1 truncate text-xs font-medium" style={{color:'var(--n-800)'}}>
                        {window.location.origin}/s/{editingStudent?.shareToken || 'Gerando...'}
                      </div>
                      <button
                        onClick={async () => {
                          if (!editingStudent) return;
                          const token = await generateShareToken(editingStudent.id);
                          const link = `${window.location.origin}/s/${token}`;
                          await navigator.clipboard.writeText(link);
                          success('Link copiado para a área de transferência!');
                        }}
                        className="p-2 rounded-lg hover:bg-white transition-all shadow-sm"
                        style={{background:'var(--n-0)', border:'1px solid var(--n-200)', color:'var(--accent)'}}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Código de Acesso */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{color:'var(--n-900)'}}>Código de Acesso</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{background:'var(--n-50)', border:'1px solid var(--n-200)'}}>
                      <div className="flex-1 truncate text-xs font-mono font-bold" style={{color:'var(--n-900)'}}>
                        {editingStudent?.shareToken || 'Gerando...'}
                      </div>
                      <button
                        onClick={async () => {
                          if (!editingStudent) return;
                          const token = await generateShareToken(editingStudent.id);
                          await navigator.clipboard.writeText(token);
                          success('Código copiado!');
                        }}
                        className="p-2 rounded-lg hover:bg-white transition-all shadow-sm"
                        style={{background:'var(--n-0)', border:'1px solid var(--n-200)', color:'var(--n-900)'}}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-2" style={{background:'var(--accent-light)', border:'1.5px dashed var(--accent)'}}>
                  <div className="flex items-start gap-2">
                    <Check size={14} style={{color:'var(--accent)', marginTop:'2px'}} className="flex-shrink-0" />
                    <p className="text-[11px] leading-relaxed" style={{color:'var(--n-800)'}}>
                      Este link é <strong>público</strong> para quem tiver o código. O aluno não precisa de senha para acessar o portal dele.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalTab('data')}
                  className="w-full py-3 text-xs font-bold rounded-xl transition-all touch-manipulation"
                  style={{border:'1.5px solid var(--n-200)', color:'var(--n-800)'}}
                >
                  Voltar para Dados
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {showPricing && (
        <PricingPlans
          onClose={() => setShowPricing(false)}
          highlightFeature="students"
        />
      )}
    </div>
  );
};

export default Students;
