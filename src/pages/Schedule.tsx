import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { format, addDays, startOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, ChevronLeft, ChevronRight, Grid3x3, Plus, X, List, CheckCircle2, MessageCircle, Dumbbell, Trash2, Calendar, Check } from 'lucide-react';
import { Appointment, MuscleGroup } from '../types';
import { useToast } from '../hooks/useToast';
import { useAppointments } from '../hooks/useAppointments';
import { useStudents } from '../hooks/useStudents';
import DroppableTimeSlot from '../components/DroppableTimeSlot';
import DraggableAppointment from '../components/DraggableAppointment';

interface TimeSlot {
  time: string;
  appointments: Appointment[];
}

const MUSCLE_GROUPS: { id: MuscleGroup; label: string; emoji: string }[] = [
  { id: 'peito',        label: 'Peito',        emoji: '🫀' },
  { id: 'costas',       label: 'Costas',       emoji: '🔙' },
  { id: 'ombros',       label: 'Ombros',       emoji: '🏋️' },
  { id: 'biceps',       label: 'Bíceps',       emoji: '💪' },
  { id: 'triceps',      label: 'Tríceps',      emoji: '🦾' },
  { id: 'quadriceps',   label: 'Quadríceps',   emoji: '🦵' },
  { id: 'posterior',    label: 'Posterior',    emoji: '🦿' },
  { id: 'gluteos',      label: 'Glúteos',      emoji: '🍑' },
  { id: 'panturrilha',  label: 'Panturrilha',  emoji: '🦶' },
  { id: 'abdomen',      label: 'Abdômen',      emoji: '⚡' },
  { id: 'trapezio',     label: 'Trapézio',     emoji: '🔺' },
  { id: 'antebraco',    label: 'Antebraço',    emoji: '🤜' },
  { id: 'full_body',    label: 'Full Body',    emoji: '🔥' },
  { id: 'cardio',       label: 'Cardio',       emoji: '🏃' },
];

const Schedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('day');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTime, setQuickAddTime] = useState('08:00');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddDuration, setQuickAddDuration] = useState(60);
  const [quickAddMode, setQuickAddMode] = useState<'existing' | 'trial'>('existing');
  const [quickAddStudentId, setQuickAddStudentId] = useState<string>('1');

  const { success } = useToast();
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [modalMuscles, setModalMuscles] = useState<MuscleGroup[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const { appointments, addAppointment, updateAppointment, deleteAppointment, markSessionDone: markDone } = useAppointments();
  const { students: allStudents } = useStudents();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 10,
      },
    })
  );

  // ── Radix Modal Component ──
  const RadixModal: React.FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    headerAction?: React.ReactNode;
  }> = ({ isOpen, onOpenChange, title, icon, children, headerAction }) => (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay 
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in"
        />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 z-[101] w-full sm:max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
          style={{ maxHeight: '92dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-n-200">
            {icon}
            <Dialog.Title className="text-base font-bold flex-1 text-n-900">{title}</Dialog.Title>
            <div className="flex items-center gap-1">
              {headerAction}
              <Dialog.Close className="w-8 h-8 rounded-full flex items-center justify-center bg-n-100 hover:bg-n-200 transition-colors">
                <X size={15} className="text-n-600" />
              </Dialog.Close>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-5 overscroll-contain">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 5; hour <= 22; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      slots.push({
        time,
        appointments: appointments[dateKey]?.filter(apt => apt.time === time) || []
      });
    }
    return slots;
  };

  const getWeekDates = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(start, i));
    }
    return dates;
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const appointmentId = active.id as string;
    const overId = over.id as string;
    
    // Find the appointment
    const appointment = Object.values(appointments)
      .flat()
      .find(apt => apt.id === appointmentId);
    
    if (!appointment) {
      setActiveId(null);
      return;
    }

    // Parse target: week view uses "yyyy-MM-dd-HH:MM", day view uses "HH:MM"
    let newDateKey: string;
    let newTime: string;
    const weekMatch = overId.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})$/);
    if (weekMatch) {
      newDateKey = weekMatch[1];
      newTime = weekMatch[2];
    } else {
      newDateKey = format(currentDate, 'yyyy-MM-dd');
      newTime = overId;
    }

    const oldDateKey = format(appointment.date, 'yyyy-MM-dd');

    // No-op: dropped on the exact same slot
    if (oldDateKey === newDateKey && appointment.time === newTime) {
      setActiveId(null);
      return;
    }

    // Persist to Supabase
    updateAppointment(appointmentId, { date: newDateKey, time: newTime })
      .then(() => success(`Aula de ${appointment.studentName} movida para ${newTime}`))
      .catch((err: any) => console.error('[Schedule] Erro ao mover:', err.message));

    setActiveId(null);
  };

  const handleQuickAdd = async () => {
    const selectedStudent = availableStudents.find(s => s.id === quickAddStudentId);
    if (quickAddMode === 'trial' && !quickAddName.trim()) return;
    const displayName = quickAddMode === 'trial' ? quickAddName.trim() : (selectedStudent?.name ?? 'Aluno');
    const dateKey = format(currentDate, 'yyyy-MM-dd');

    try {
      await addAppointment({
        studentId: quickAddMode === 'trial' ? (selectedStudent?.id ?? allStudents[0]?.id ?? '') : (selectedStudent?.id ?? ''),
        studentName: displayName,
        date: dateKey,
        time: quickAddTime,
        duration: quickAddDuration,
      });
      success(`Aula de ${displayName} adicionada às ${quickAddTime}`);
    } catch (err: any) {
      console.error('[Schedule] Erro ao adicionar:', err.message);
    }
    setQuickAddName('');
    setQuickAddDuration(60);
    setShowQuickAdd(false);
    setQuickAddMode('existing');
  };

  const openAptModal = (apt: Appointment) => {
    setSelectedApt(apt);
    setModalMuscles(apt.muscleGroups || []);
  };
  const closeAptModal = () => { setSelectedApt(null); setModalMuscles([]); };

  const toggleMuscle = (m: MuscleGroup) =>
    setModalMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const saveAptChanges = async (done: boolean) => {
    if (!selectedApt) return;
    try {
      await markDone(selectedApt.id, modalMuscles);
      if (!done) {
        await updateAppointment(selectedApt.id, { session_done: false, muscle_groups: modalMuscles });
      }
      success(`Sessão de ${selectedApt.studentName} ${done ? 'concluída' : 'atualizada'}!`);
    } catch (err: any) {
      console.error('[Schedule] Erro ao salvar:', err.message);
    }
    closeAptModal();
  };

  const handleDeleteApt = async () => {
    if (!selectedApt) return;
    if (!window.confirm(`Tem certeza que deseja excluir o atendimento de ${selectedApt.studentName}?`)) return;
    
    try {
      await deleteAppointment(selectedApt.id);
      success('Atendimento excluído!');
      closeAptModal();
    } catch (err: any) {
      console.error('[Schedule] Erro ao excluir:', err.message);
    }
  };

  const buildWaUrl = (apt: Appointment) => {
    const phone = (apt.phone || '').replace(/\D/g, '');
    const waPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const dateStr = format(apt.date, "d 'de' MMMM", { locale: ptBR });
    const msg = encodeURIComponent(
      `Olá, ${apt.studentName.split(' ')[0]}! 😊\n\n` +
      `Lembrando que sua aula está agendada para hoje, ${dateStr}, às ${apt.time}.\n\n` +
      `Qualquer dúvida, estou à disposição! 💪\n\n` +
      `_Esta é uma mensagem automática._`
    );
    return `https://wa.me/${waPhone}?text=${msg}`;
  };

  const activeAppointment = activeId 
    ? Object.values(appointments).flat().find(apt => apt.id === activeId)
    : null;

  const timeSlots = generateTimeSlots();
  const weekDates = getWeekDates();

  const availableStudents = useMemo<{id:string; name:string}[]>(() => {
    if (allStudents.length > 0) {
      return allStudents.filter(s => s.isActive).map(s => ({ id: s.id, name: s.name }));
    }
    const m = new Map<string, string>();
    Object.values(appointments).flat().forEach((a: Appointment) => {
      m.set(a.studentId, a.studentName);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [appointments, allStudents]);

  useEffect(() => {
    if (availableStudents.length > 0 && !availableStudents.find(s => s.id === quickAddStudentId)) {
      setQuickAddStudentId(availableStudents[0].id);
    }
  }, [availableStudents, quickAddStudentId]);

  const handleAddSlot = (timeId: string) => {
    let dateKey = format(currentDate, 'yyyy-MM-dd');
    let slotTime = timeId;
    const wk = timeId.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})$/);
    if (wk) {
      dateKey = wk[1];
      slotTime = wk[2];
      setCurrentDate(new Date(dateKey));
    }
    setQuickAddTime(slotTime);
    setShowQuickAdd(true);
    setQuickAddMode('existing');
    setQuickAddName('');
  };

  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const todayAppointments = appointments[dateKey] || [];
  const totalMinutes = todayAppointments.reduce((acc, apt) => acc + apt.duration, 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="animate-fade-in-up">
        {/* Header */}
        <div className="page-header flex flex-col gap-4 mb-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight" style={{color:'var(--n-900)'}}>Agenda</h1>
              <p className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>Gerencie seus atendimentos</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-xs px-3 py-2 rounded-lg font-bold active:scale-95 transition-all touch-manipulation"
                style={{background:'var(--accent-light)', color:'var(--accent)', border:'1px solid var(--accent)'}}
              >
                Hoje
              </button>
              <div className="flex rounded-lg p-0.5" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}>
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-2.5 py-1.5 rounded-md transition-all duration-120 flex items-center gap-1 touch-manipulation text-xs font-semibold ${
                    viewMode === 'day'
                      ? 'bg-white shadow-sm'
                      : ''
                  }`}
                  style={{color: viewMode === 'day' ? 'var(--accent)' : 'var(--n-400)'}}
                >
                  <Clock size={13} />
                  <span>Dia</span>
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-2.5 py-1.5 rounded-md transition-all duration-120 flex items-center gap-1 touch-manipulation text-xs font-semibold ${
                    viewMode === 'week'
                      ? 'bg-white shadow-sm'
                      : ''
                  }`}
                  style={{color: viewMode === 'week' ? 'var(--accent)' : 'var(--n-400)'}}
                >
                  <Grid3x3 size={13} />
                  <span>Sem</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-md transition-all duration-120 flex items-center gap-1 touch-manipulation text-xs font-semibold ${
                    viewMode === 'list'
                      ? 'bg-white shadow-sm'
                      : ''
                  }`}
                  style={{color: viewMode === 'list' ? 'var(--accent)' : 'var(--n-400)'}}
                >
                  <List size={13} />
                  <span>Lista</span>
                </button>
              </div>
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, viewMode === 'day' ? -1 : -7))}
              className="p-2 rounded-lg transition-all touch-manipulation hover:bg-black/5"
            >
              <ChevronLeft size={20} style={{color:'var(--n-500)'}} />
            </button>
            <div className="text-center">
              <div className="text-sm font-bold" style={{color:'var(--n-900)'}}>
                {viewMode === 'day'
                  ? format(currentDate, "d 'de' MMMM", { locale: ptBR })
                  : `${format(weekDates[0], "d MMM", { locale: ptBR })} – ${format(weekDates[6], "d MMM yyyy", { locale: ptBR })}`
                }
              </div>
              {viewMode === 'day' && (
                <div className="text-xs" style={{color:'var(--n-400)'}}>
                  {format(currentDate, 'yyyy')} {isToday(currentDate) && <span style={{color:'var(--accent)'}} className="font-semibold">· Hoje</span>}
                </div>
              )}
            </div>
            <button
              onClick={() => setCurrentDate(prev => addDays(prev, viewMode === 'day' ? 1 : 7))}
              className="p-2 rounded-lg transition-all touch-manipulation hover:bg-black/5"
            >
              <ChevronRight size={20} style={{color:'var(--n-500)'}} />
            </button>
          </div>

          {/* Day stats */}
          {viewMode === 'day' && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Clientes', value: todayAppointments.length },
                { label: 'Horas', value: `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ''}` },
                { label: 'Livres', value: timeSlots.filter(s => s.appointments.length === 0).length },
              ].map((stat) => (
                <div key={stat.label} className="stat-chip">
                  <div className="stat-chip-value text-lg">{stat.value}</div>
                  <div className="stat-chip-label">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Day View */}
        {viewMode === 'day' && todayAppointments.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'var(--accent-light)',border:'1px solid var(--n-200)'}}>
              <Clock size={24} style={{color:'var(--accent)'}} />
            </div>
            <p className="text-sm font-bold" style={{color:'var(--n-900)'}}>Nenhum atendimento agendado</p>
            <p className="text-xs mt-1 mb-4" style={{color:'var(--n-400)'}}>
              {isToday(currentDate) ? 'Dia livre hoje!' : 'Nenhum atendimento neste dia'}
            </p>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="btn btn-primary text-sm"
            >
              <Plus size={14} />
              Agendar
            </button>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="space-y-1 px-1">
            {timeSlots.map((slot) => {
              const currentHour = `${currentTime.getHours().toString().padStart(2, '0')}:00`;
              const isCurrentHour = isToday(currentDate) && slot.time === currentHour;
              return (
                <div
                  key={slot.time}
                  className="relative rounded-xl"
                >
                  {isCurrentHour && (
                    <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: `${(currentTime.getMinutes() / 60) * 100}%` }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:'var(--error)'}} />
                      <div className="flex-1 h-px" style={{background:'var(--error)',opacity:0.5}} />
                      <span className="text-xs font-bold ml-1 flex-shrink-0 px-1.5 py-0.5 rounded" style={{color:'var(--error)',background:'var(--error-light)',fontSize:'0.625rem'}}>
                        {format(currentTime, 'HH:mm')}
                      </span>
                    </div>
                  )}
                  <DroppableTimeSlot
                    time={slot.time}
                    appointments={slot.appointments}
                    onPressAppointment={openAptModal}
                    onAdd={handleAddSlot}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
              {/* Week header */}
              <div className="grid grid-cols-8 gap-1 mb-2 sticky top-0 z-10" style={{background:'var(--n-100)'}}>
                <div className="text-xs font-bold p-2 text-center uppercase tracking-wider rounded-lg" style={{color:'var(--n-600)',background:'var(--n-0)',border:'1px solid var(--n-200)'}}>Hr</div>
                {weekDates.map((date, i) => {
                  const dk = format(date, 'yyyy-MM-dd');
                  const dayCount = appointments[dk]?.length || 0;
                  const today = isToday(date);
                  return (
                    <div
                      key={i}
                      onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                      className="text-center p-1.5 rounded-lg transition-all cursor-pointer"
                      style={today
                        ? {background:'var(--accent-light)',border:'2px solid var(--accent)'}
                        : {background:'var(--n-0)',border:'1px solid var(--n-200)'}}
                    >
                      <div className="text-xs font-bold capitalize" style={{color: today ? 'var(--accent)' : 'var(--n-600)'}}>
                        {format(date, 'EEE', { locale: ptBR })}
                      </div>
                      <div className="text-sm font-extrabold" style={{color: today ? 'var(--accent)' : 'var(--n-900)'}}>
                        {format(date, 'd')}
                      </div>
                      {dayCount > 0 && (
                        <div className="flex justify-center gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(dayCount, 3) }).map((_, j) => (
                            <div key={j} className={`w-1 h-1 rounded-full ${today ? 'bg-blue-400' : 'bg-slate-600'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Week time slots */}
              <div className="space-y-0.5">
                {timeSlots.map((slot) => (
                  <div key={slot.time} className="grid grid-cols-8 gap-1">
                    <div className="text-xs font-bold p-2 text-center self-start rounded-lg" style={{color:'var(--n-700)',background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
                      {slot.time}
                    </div>
                    {weekDates.map((date, dateIndex) => {
                      const dk = format(date, 'yyyy-MM-dd');
                      const dayApts = appointments[dk]?.filter(apt => apt.time === slot.time) || [];
                      return (
                        <DroppableTimeSlot
                          key={dateIndex}
                          time={`${dk}-${slot.time}`}
                          appointments={dayApts}
                          isWeekView={true}
                          isCompact={true}
                          onAdd={handleAddSlot}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Weekly List View */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            {weekDates.map((date) => {
              const dk = format(date, 'yyyy-MM-dd');
              const dayApts = (appointments[dk] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
              const isPast = !isToday(date) && date < new Date(new Date().setHours(0,0,0,0));
              return (
                <div
                  key={dk}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{
                    border: isToday(date)
                      ? '2px solid var(--accent)'
                      : '1px solid var(--n-200)',
                    background: 'var(--n-0)'
                  }}
                >
                  {/* Day header */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
                    style={{
                      background: isToday(date)
                        ? 'var(--accent-light)'
                        : 'var(--n-0)'
                    }}
                    onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
                        style={isToday(date)
                          ? {background:'var(--accent)',color:'var(--n-0)'}
                          : isPast
                          ? {background:'var(--n-100)',color:'var(--n-400)'}
                          : {background:'var(--n-100)',color:'var(--n-700)'}
                        }
                      >
                        {format(date, 'd')}
                      </div>
                      <div>
                        <div className="text-sm font-bold capitalize" style={{color: isToday(date) ? 'var(--accent)' : isPast ? 'var(--n-400)' : 'var(--n-900)'}}>
                          {format(date, 'EEEE', { locale: ptBR })}
                          {isToday(date) && <span className="ml-1.5 text-xs font-semibold" style={{color:'var(--accent)'}}> Hoje</span>}
                        </div>
                        <div className="text-xs" style={{color:'var(--n-400)'}}>
                          {format(date, "d 'de' MMMM", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dayApts.length > 0 && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={isToday(date)
                            ? {background:'var(--accent-light)',color:'var(--accent)'}
                            : {background:'var(--n-100)',color:'var(--n-500)'}
                          }
                        >
                          {dayApts.length} {dayApts.length === 1 ? 'aluno' : 'alunos'}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentDate(date); setQuickAddTime('08:00'); setShowQuickAdd(true); }}
                        className="text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
                        style={{color:'var(--accent)'}}
                      >
                        Adicionar
                      </button>
                      <ChevronRight size={14} style={{color:'var(--n-400)'}} />
                    </div>
                  </div>

                  {/* Student list */}
                  {dayApts.length === 0 ? (
                    <div className="px-4 py-3" style={{background:'var(--n-50)'}}>
                      <p className="text-xs italic" style={{color:'var(--n-400)'}}>Nenhum atendimento agendado</p>
                    </div>
                  ) : (
                    <div style={{background:'var(--n-0)'}}>
                      {dayApts.map((apt, aptIdx) => {
                        const FEMALE_NAMES_LIST = ['ana','maria','fernanda','julia','juliana','camila','beatriz','larissa','amanda','patricia','gabriela','leticia','isabela','isabel','bruna','natalia','renata','vanessa','claudia','mariana','carolina','aline','alice','laura','sofia','valentina','helena','bianca','priscila','luciana'];
                        const fn = apt.studentName.split(' ')[0].toLowerCase();
                        const isFem = FEMALE_NAMES_LIST.includes(fn);
                        const bColor = isFem ? 'rgba(56,189,248,0.6)' : 'rgba(30,64,175,0.6)';
                        const aColor = isFem ? 'rgba(56,189,248,0.15)' : 'rgba(30,64,175,0.15)';
                        const tColor = isFem ? '#0ea5e9' : '#1e40af';
                        const initials = apt.studentName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                        const muscles = apt.muscleGroups || [];
                        return (
                          <button
                            key={apt.id}
                            onClick={() => openAptModal(apt)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors touch-manipulation hover:bg-black/[0.02] ${apt.sessionDone ? 'opacity-60' : ''}`}
                            style={{
                              borderBottom: aptIdx < dayApts.length - 1 ? '1px solid var(--n-200)' : 'none',
                            }}
                          >
                            <div className="relative flex-shrink-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                                style={{background: aColor, color: tColor, border: `1.5px solid ${bColor}`}}
                              >
                                {initials}
                              </div>
                              {apt.sessionDone && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle2 size={10} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-bold truncate block ${apt.sessionDone ? 'line-through' : ''}`} style={{color: apt.sessionDone ? 'var(--n-400)' : 'var(--n-900)'}}>{apt.studentName}</span>
                              {muscles.length > 0 ? (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {muscles.map(m => {
                                    const mg = MUSCLE_GROUPS.find(g => g.id === m);
                                    return mg ? <span key={m} className="text-[11px] leading-none" title={mg.label}>{mg.emoji}</span> : null;
                                  })}
                                  <span className="text-[10px] ml-0.5" style={{color:'var(--n-500)'}}>{muscles.map(m => MUSCLE_GROUPS.find(g=>g.id===m)?.label).join(', ')}</span>
                                </div>
                              ) : (
                                <div className="text-xs" style={{color:'var(--n-500)'}}>{apt.duration} min</div>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-sm font-black" style={{color: tColor}}>{apt.time}</div>
                              {apt.sessionDone ? (
                                <div className="text-[10px] text-emerald-400 font-semibold">concluído ✓</div>
                              ) : isPast ? (
                                <div className="text-[10px] text-amber-400 font-semibold">pendente</div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Add Modal via Radix */}
      <RadixModal
        isOpen={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        title="Agendar Atendimento"
        icon={<Plus size={18} className="text-accent" />}
      >
        <div className="space-y-4">
          <div className="flex gap-2 p-1 rounded-xl bg-n-50 border border-n-200">
            <button
              onClick={() => setQuickAddMode('existing')}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={quickAddMode === 'existing' 
                ? { background: 'var(--accent)', color: 'var(--n-0)' } 
                : { color: 'var(--n-500)' }}
            >
              Aluno Ativo
            </button>
            <button
              onClick={() => setQuickAddMode('trial')}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={quickAddMode === 'trial' 
                ? { background: 'var(--accent)', color: 'var(--n-0)' } 
                : { color: 'var(--n-500)' }}
            >
              Experimental
            </button>
          </div>

          <div className="space-y-4">
            {quickAddMode === 'existing' ? (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-n-600">Cliente cadastrado</label>
                <select
                  value={quickAddStudentId}
                  onChange={(e) => setQuickAddStudentId(e.target.value)}
                  className="input-base w-full appearance-none bg-no-repeat bg-[right_1rem_center]"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                >
                  {availableStudents.length === 0 && <option value="">Nenhum cliente</option>}
                  {availableStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-n-600">Nome do Aluno</label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="input-base w-full"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-n-600">Horário</label>
                <select
                  value={quickAddTime}
                  onChange={(e) => setQuickAddTime(e.target.value)}
                  className="input-base w-full text-sm"
                >
                  {Array.from({ length: 15 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-n-600">Duração</label>
                <select
                  value={quickAddDuration}
                  onChange={(e) => setQuickAddDuration(Number(e.target.value))}
                  className="input-base w-full text-sm"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowQuickAdd(false)}
              className="flex-1 px-4 py-3 text-sm font-semibold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleQuickAdd}
              disabled={quickAddMode === 'trial' ? !quickAddName.trim() : !quickAddStudentId}
              className="btn btn-primary flex-1 text-sm font-bold disabled:opacity-40"
            >
              Agendar Atendimento
            </button>
          </div>
        </div>
      </RadixModal>

      {/* Appointment Detail Modal via Radix */}
      <RadixModal
        isOpen={!!selectedApt}
        onOpenChange={(open) => !open && closeAptModal()}
        title={selectedApt?.studentName || 'Detalhes do Treino'}
        icon={
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
          >
            {selectedApt?.studentName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
          </div>
        }
        headerAction={
          <button onClick={handleDeleteApt} className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors">
            <Trash2 size={16} />
          </button>
        }
      >
        {selectedApt && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-n-50 border border-n-100">
              <Calendar size={14} className="text-n-400" />
              <span className="text-xs font-bold text-n-600">
                {format(selectedApt.date, "d 'de' MMMM", { locale: ptBR })} · {selectedApt.time} · {selectedApt.duration}min
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => saveAptChanges(!selectedApt.sessionDone)}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all"
                style={selectedApt.sessionDone
                  ? { background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }
                  : { background: 'var(--n-50)', color: 'var(--n-600)', border: '1px solid var(--n-200)' }}
              >
                <CheckCircle2 size={16} />
                {selectedApt.sessionDone ? 'Concluída ✓' : 'Marcar Feita'}
              </button>
              <a
                href={buildWaUrl(selectedApt)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all bg-[#e1faea] text-[#16a34a] border border-[#bbf7d0]"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Dumbbell size={15} className="text-n-400" />
                <span className="text-sm font-bold text-n-900">Grupamentos Treinados</span>
                {modalMuscles.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-light text-accent">
                    {modalMuscles.length} selecionado{modalMuscles.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MUSCLE_GROUPS.map(mg => {
                  const active = modalMuscles.includes(mg.id);
                  return (
                    <button
                      key={mg.id}
                      onClick={() => toggleMuscle(mg.id)}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-xs font-bold transition-all"
                      style={active
                        ? { background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }
                        : { background: 'var(--n-50)', border: '1px solid var(--n-200)', color: 'var(--n-600)' }}
                    >
                      <span className="text-lg">{mg.emoji}</span>
                      <span className="truncate">{mg.label}</span>
                      {active && <Check size={12} className="ml-auto text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeAptModal}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-n-500 hover:bg-n-50 transition-colors border border-n-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveAptChanges(selectedApt.sessionDone ?? false)}
                className="btn btn-primary flex-1 py-3.5 text-sm font-bold shadow-lg shadow-accent/20"
              >
                Salvar Treino
              </button>
            </div>
          </div>
        )}
      </RadixModal>

      <DragOverlay>
        {activeAppointment && (
          <div className="rotate-2 scale-105 shadow-large opacity-90">
            <DraggableAppointment appointment={activeAppointment} isDragging={true} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default Schedule;
