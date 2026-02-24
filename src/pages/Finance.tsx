import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock, BarChart2, ArrowUpRight, ArrowDownRight, MessageCircle, BadgeCheck, AlertTriangle } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Student, Appointment } from '../types';
import FeatureGate from '../components/FeatureGate';
import { usePermissions } from '../hooks/usePermissions';
import { useStudents } from '../hooks/useStudents';

const DAY_MAP: Record<string, number> = { Domingo:0, Segunda:1, Terça:2, Quarta:3, Quinta:4, Sexta:5, Sábado:6 };
const CUR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const AVATAR_COLORS = ['from-blue-400 to-blue-600','from-purple-400 to-purple-600','from-green-400 to-green-600','from-orange-400 to-orange-600','from-pink-400 to-pink-600','from-indigo-400 to-indigo-600'];

function buildMonthAppointments(students: Student[], monthDate: Date, today: Date): Appointment[] {
  const days = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
  const apts: Appointment[] = [];
  students.filter(s => !s.isConsulting).forEach(student => {
    student.selectedDays.forEach((dayName, idx) => {
      const jsDay = DAY_MAP[dayName];
      const time  = student.selectedTimes[idx] || '08:00';
      days.forEach(day => {
        if (getDay(day) !== jsDay) return;
        // Inactive students: skip future sessions — excluded from future planning
        if (!student.isActive && isBefore(today, startOfDay(day))) return;
        apts.push({ id: `${student.id}-${format(day,'yyyy-MM-dd')}-${time}`, studentId: student.id, studentName: student.name, date: day, time, duration: 60 });
      });
    });
  });
  return apts;
}

interface PaymentStatus { paid: boolean; paidAt?: Date; dueDate: Date; }
interface SummaryRow { student: Student; totalStu: number; doneStu: number; pendStu: number; earned: number; expected: number; idx: number; }

const FinanceContent: React.FC = () => {
  const { students } = useStudents();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [section, setSection] = useState<'overview'|'calendar'|'students'>('overview');
  const today = startOfDay(new Date());

  // Payment status per student — monthly uses billingDay; session uses próxima sessão
  const billingDateForMonth = (student: Student, baseMonth: Date) => {
    const day = student.billingDay ?? 1;
    const year = baseMonth.getFullYear();
    const month = baseMonth.getMonth();
    const lastDay = endOfMonth(baseMonth).getDate();
    const safeDay = Math.min(day, lastDay);
    return startOfDay(new Date(year, month, safeDay));
  };

  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, PaymentStatus>>({});

  // Re-initialize payment statuses when students load from Supabase
  React.useEffect(() => {
    if (students.length === 0) return;
    const todayInit = startOfDay(new Date());
    const monthAptsInit = buildMonthAppointments(students, new Date(), todayInit);
    const init: Record<string, PaymentStatus> = {};
    students.forEach(s => {
      if (s.plan === 'monthly') {
        init[s.id] = { paid: false, dueDate: billingDateForMonth(s, new Date()) };
      } else {
        const nextSession = monthAptsInit
          .filter(a => a.studentId === s.id && isBefore(todayInit, startOfDay(a.date)))
          .sort((a,b)=>a.date.getTime()-b.date.getTime())[0];
        init[s.id] = { paid: false, dueDate: nextSession ? startOfDay(nextSession.date) : todayInit };
      }
    });
    setPaymentStatuses(prev => {
      // Preserve existing paid statuses
      const merged = { ...init };
      Object.keys(prev).forEach(id => {
        if (merged[id] && prev[id].paid) {
          merged[id] = prev[id];
        }
      });
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const nextSessionDue = (studentId: string) => {
    const nextPending = pendingApts
      .filter(a => a.studentId === studentId)
      .sort((a,b)=>a.date.getTime()-b.date.getTime())[0];
    return nextPending ? startOfDay(nextPending.date) : today;
  };

  const togglePaid = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setPaymentStatuses(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        paid: !prev[studentId].paid,
        paidAt: !prev[studentId].paid ? new Date() : undefined,
        dueDate: student?.plan === 'session'
          ? nextSessionDue(studentId)
          : prev[studentId].dueDate,
      },
    }));
  };

  const monthApts     = useMemo(() => buildMonthAppointments(students, currentMonth, today), [students, currentMonth, today]);
  const completedApts = useMemo(() => monthApts.filter(a => !isBefore(today, startOfDay(a.date))), [monthApts, today]);
  const pendingApts   = useMemo(() => monthApts.filter(a =>  isBefore(today, startOfDay(a.date))), [monthApts, today]);

  const summaries: SummaryRow[] = useMemo(() => students.map((student, idx) => {
    const stuApts  = monthApts.filter(a => a.studentId === student.id);
    const doneStu  = completedApts.filter(a => a.studentId === student.id).length;
    const pendStu  = pendingApts.filter(a => a.studentId === student.id).length;
    const totalStu = stuApts.length;
    const earned   = student.plan === 'monthly' ? (student.isActive ? student.value : 0) : doneStu * student.value;
    const expected = student.plan === 'monthly' ? (student.isActive ? student.value : 0) : (student.isActive ? totalStu * student.value : doneStu * student.value);
    return { student, totalStu, doneStu, pendStu, earned, expected, idx };
  }), [students, monthApts, completedApts, pendingApts]);

  const totalExpected = summaries.reduce((s,r) => s+r.expected, 0);
  const totalEarned   = summaries.reduce((s,r) => s+r.earned,   0);
  const totalPending  = totalExpected - totalEarned;
  const pct           = totalExpected > 0 ? Math.round((totalEarned/totalExpected)*100) : 0;

  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    return days.map(day => {
      const dayApts    = monthApts.filter(a => format(a.date,'yyyy-MM-dd') === format(day,'yyyy-MM-dd'));
      const isPast     = !isBefore(today, startOfDay(day));
      const sessionRev = dayApts.reduce((sum,a) => { const s = students.find(st => st.id===a.studentId); return sum+(s?.plan==='session'?s.value:0); }, 0);
      return { day, dayApts, isPast, sessionRev };
    });
  }, [currentMonth, monthApts, students, today]);

  const leadingBlanks = useMemo(() => { const fd=getDay(startOfMonth(currentMonth)); return fd===0?6:fd-1; }, [currentMonth]);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight" style={{color:'var(--n-900)'}}>Finanças</h1>
            <p className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>Controle financeiro</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setCurrentMonth(m=>subMonths(m,1))} className="p-2 rounded-lg hover:bg-black/5 transition-all touch-manipulation"><ChevronLeft size={18} style={{color:'var(--n-400)'}}/></button>
            <span className="text-sm font-bold capitalize min-w-[120px] text-center" style={{color:'var(--n-900)'}}>{format(currentMonth,'MMM yyyy',{locale:ptBR})}</span>
            <button onClick={()=>setCurrentMonth(m=>addMonths(m,1))} className="p-2 rounded-lg hover:bg-black/5 transition-all touch-manipulation"><ChevronRight size={18} style={{color:'var(--n-400)'}}/></button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([{label:'Previsto',value:CUR(totalExpected),color:'var(--accent)'},{label:'Recebido',value:CUR(totalEarned),color:'var(--success)'},{label:'A receber',value:CUR(totalPending),color:'var(--warning)'}]).map(card=>(
            <div key={card.label} className="rounded-lg p-2.5 text-center" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
              <div className="text-xs font-extrabold leading-tight" style={{color:card.color}}>{card.value}</div>
              <div className="text-[10px] mt-0.5" style={{color:'var(--n-500)'}}>{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="px-4 pt-4">
        <div className="flex rounded-lg p-0.5" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}>
          {([{id:'overview' as const,label:'Resumo',Icon:TrendingUp},{id:'calendar' as const,label:'Calendário',Icon:Calendar},{id:'students' as const,label:'Clientes',Icon:Users}]).map(tab=>(
            <button key={tab.id} onClick={()=>setSection(tab.id)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-all touch-manipulation ${section===tab.id?'bg-white shadow-sm':''}`} style={{color: section===tab.id ? 'var(--accent)' : 'var(--n-400)'}}>
              <tab.Icon size={13}/>{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">

        {/* ── OVERVIEW ── */}
        {section==='overview' && (
          <OverviewSection
            students={students}
            summaries={summaries}
            totalExpected={totalExpected}
            totalEarned={totalEarned}
            totalPending={totalPending}
            pct={pct}
            monthApts={monthApts}
            completedApts={completedApts}
            pendingApts={pendingApts}
          />
        )}

        {/* ── CALENDAR ── */}
        {section==='calendar' && (
          <CalendarSection calendarDays={calendarDays} leadingBlanks={leadingBlanks}/>
        )}

        {/* ── STUDENTS ── */}
        {section==='students' && (
          <StudentsSection summaries={summaries} paymentStatuses={paymentStatuses} onTogglePaid={togglePaid} today={today}/>
        )}

      </div>
    </div>
  );
};

/* ── Overview ── */
interface OverviewProps {
  students: Student[]; summaries: SummaryRow[];
  totalExpected: number; totalEarned: number; totalPending: number; pct: number;
  monthApts: Appointment[]; completedApts: Appointment[]; pendingApts: Appointment[];
}
const OverviewSection: React.FC<OverviewProps> = ({ students, summaries, totalExpected, totalEarned, totalPending, pct, monthApts, completedApts, pendingApts }) => (
  <>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl p-3 text-left" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--success-light)'}}><DollarSign size={14} style={{color:'var(--success)'}}/></div>
          <span className="text-xs" style={{color:'var(--n-500)'}}>Receita prevista</span>
        </div>
        <div className="text-base font-extrabold" style={{color:'var(--success)'}}>{CUR(totalExpected)}</div>
        <div className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>clientes ativos</div>
      </div>
      <div className="rounded-xl p-3 text-left" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'var(--accent-light)'}}><Users size={14} style={{color:'var(--accent)'}}/></div>
          <span className="text-xs" style={{color:'var(--n-500)'}}>Sessões no mês</span>
        </div>
        <div className="text-base font-extrabold" style={{color:'var(--accent)'}}>{monthApts.length}</div>
        <div className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>{completedApts.length} feitas · {pendingApts.length} pendentes</div>
      </div>
    </div>

    <div className="rounded-xl p-4" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{color:'var(--n-900)'}}>Progresso do mês</span>
        <span className="text-xs font-bold" style={{color:'var(--accent)'}}>{pct}%</span>
      </div>
      <div className="w-full rounded-full h-2.5 overflow-hidden" style={{background:'var(--n-200)'}}>
        <div className="h-2.5 rounded-full transition-all duration-700" style={{width:`${pct}%`,background:'var(--accent)'}}/>
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <span className="font-semibold" style={{color:'var(--success)'}}>{CUR(totalEarned)} recebido</span>
        <span className="font-semibold" style={{color:'var(--warning)'}}>{CUR(totalPending)} pendente</span>
      </div>
    </div>

    <div className="rounded-xl p-4" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
      <h3 className="text-sm font-bold mb-3" style={{color:'var(--n-900)'}}>Por tipo de plano</h3>
      <div className="space-y-3">
        {([{key:'monthly' as const,label:'Mensal',dot:'bg-blue-500'},{key:'session' as const,label:'Sessão',dot:'bg-purple-500'}] as const).map(({key,label,dot}) => {
          const rows   = summaries.filter(r => r.student.plan === key);
          const earned = rows.reduce((s,r) => s+r.earned,   0);
          const exp    = rows.reduce((s,r) => s+r.expected, 0);
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${dot}`}/>
                <span className="text-sm" style={{color:'var(--n-900)'}}>{label}</span>
                <span className="text-xs" style={{color:'var(--n-500)'}}>({rows.filter(r=>r.student.isActive).length} ativos)</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold" style={{color:'var(--n-900)'}}>{CUR(earned)}</span>
                  {earned>=exp ? <ArrowUpRight size={13} style={{color:'var(--success)'}}/> : <ArrowDownRight size={13} style={{color:'var(--warning)'}}/>}
                </div>
                {key==='session' && exp>0 && <span className="text-[10px]" style={{color:'var(--n-500)'}}>de {CUR(exp)} previsto</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2">
      {[
        {label:'Ativos', value:students.filter(s=>s.isActive).length, color:'var(--accent)'},
        {label:'Mensal', value:students.filter(s=>s.isActive&&s.plan==='monthly').length, color:'var(--success)'},
        {label:'Sessão', value:students.filter(s=>s.isActive&&s.plan==='session').length, color:'#8b5cf6'},
      ].map(s => (
        <div key={s.label} className="rounded-lg p-2.5 text-center" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
          <div className="text-xl font-extrabold" style={{color:s.color}}>{s.value}</div>
          <div className="text-[10px] mt-0.5" style={{color:'var(--n-500)'}}>{s.label}</div>
        </div>
      ))}
    </div>

    {students.some(s => !s.isActive) && (
      <div className="flex items-start gap-3 rounded-xl p-3.5" style={{background:'var(--warning-light)',border:'1px solid var(--warning)'}}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:'var(--warning)',color:'var(--n-0)'}}>
          <Clock size={13}/>
        </div>
        <div>
          <p className="text-xs font-semibold" style={{color:'var(--n-900)'}}>Clientes inativos excluídos do planejamento futuro</p>
          <p className="text-[11px] mt-0.5" style={{color:'var(--n-600)'}}>
            {students.filter(s=>!s.isActive).length} cliente(s) inativo(s) não entram nas projeções futuras.
          </p>
        </div>
      </div>
    )}
  </>
);

/* ── Calendar ── */
interface CalDay { day: Date; dayApts: Appointment[]; isPast: boolean; sessionRev: number; }
const CalendarSection: React.FC<{calendarDays: CalDay[]; leadingBlanks: number}> = ({calendarDays, leadingBlanks}) => (
  <>
    <div className="rounded-xl p-4" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
      <div className="grid grid-cols-7 mb-2">
        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-600 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length:leadingBlanks}).map((_,i) => <div key={`b${i}`}/>)}
        {calendarDays.map(({day,dayApts,isPast,sessionRev}) => {
          const has = dayApts.length > 0;
          const isT = isToday(day);
          return (
            <div key={format(day,'yyyy-MM-dd')} className="relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all"
              style={{
                background: isT ? 'var(--accent-light)' : has&&isPast ? 'var(--success-light)' : has ? 'var(--accent-light)' : 'var(--n-50)',
                border: isT ? '1.5px solid var(--accent)' : '1px solid var(--n-200)'
              }}>
              <span className="font-bold leading-none" style={{color: isT ? 'var(--accent)' : has&&isPast ? 'var(--success)' : has ? 'var(--accent)' : 'var(--n-400)'}}>{format(day,'d')}</span>
              {has && <span className={`text-[8px] font-semibold leading-none mt-0.5 ${isPast?'text-emerald-500':'text-blue-400'}`}>{dayApts.length}×</span>}
              {sessionRev>0 && <span className="text-[7px] text-purple-400 font-medium leading-none">R${sessionRev}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 pt-3" style={{borderTop:'1px solid var(--n-200)'}}>
        {[{color:'var(--success-light)',label:'Realizado'},{color:'var(--accent-light)',label:'Agendado'},{color:'var(--n-50)',label:'Sem atendimento'}].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-md" style={{background:l.color,border:'1px solid var(--n-200)'}}/>
            <span className="text-[10px]" style={{color:'var(--n-500)'}}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="space-y-2">
      <h3 className="text-sm font-bold" style={{color:'var(--n-900)'}}>Dias com sessões</h3>
      {calendarDays.filter(d => d.dayApts.length > 0).map(({day,dayApts,isPast,sessionRev}) => (
        <div key={format(day,'yyyy-MM-dd')} className="flex items-center justify-between rounded-lg px-4 py-3" style={{background:'var(--n-0)',border:'1px solid var(--n-200)'}}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: isPast ? 'var(--success-light)' : 'var(--accent-light)'}}>
              {isPast ? <CheckCircle2 size={16} style={{color:'var(--success)'}}/> : <Clock size={16} style={{color:'var(--accent)'}}/>}
            </div>
            <div>
              <div className="text-sm font-semibold capitalize" style={{color:'var(--n-900)'}}>{format(day,"EEE, d 'de' MMM",{locale:ptBR})}</div>
              <div className="text-xs" style={{color:'var(--n-500)'}}>{dayApts.length} sessão{dayApts.length>1?'ões':''} · {dayApts.map(a=>a.studentName.split(' ')[0]).join(', ')}</div>
            </div>
          </div>
          <div className="text-right">
            {sessionRev>0 && <div className="text-sm font-bold" style={{color:'#8b5cf6'}}>{CUR(sessionRev)}</div>}
            <div className="text-[10px] font-semibold" style={{color: isPast ? 'var(--success)' : 'var(--accent)'}}>{isPast?'Realizado':'Pendente'}</div>
          </div>
        </div>
      ))}
    </div>
  </>
);

/* ── Students ── */
interface StudentsSectionProps {
  summaries: SummaryRow[];
  paymentStatuses: Record<string, PaymentStatus>;
  onTogglePaid: (id: string) => void;
  today: Date;
}
const StudentsSection: React.FC<StudentsSectionProps> = ({summaries, paymentStatuses, onTogglePaid, today}) => {
  const active   = summaries.filter(r =>  r.student.isActive);
  const inactive = summaries.filter(r => !r.student.isActive);
  return (
    <div className="space-y-4">
      <div className="space-y-3">{active.map(row => <StudentCard key={row.student.id} row={row} paymentStatus={paymentStatuses[row.student.id]} onTogglePaid={onTogglePaid} today={today}/>)}</div>
      {inactive.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{background:'var(--n-200)'}}/>
            <span className="text-xs font-medium px-2" style={{color:'var(--n-400)'}}>Inativos — sessões realizadas</span>
            <div className="flex-1 h-px" style={{background:'var(--n-200)'}}/>
          </div>
          <div className="space-y-3">{inactive.map(row => <StudentCard key={row.student.id} row={row} paymentStatus={paymentStatuses[row.student.id]} onTogglePaid={onTogglePaid} today={today} inactive/>)}</div>
        </>
      )}
    </div>
  );
};

interface StudentCardProps { row: SummaryRow; paymentStatus: PaymentStatus; onTogglePaid: (id: string) => void; today: Date; inactive?: boolean; }
const StudentCard: React.FC<StudentCardProps> = ({row, paymentStatus, onTogglePaid, today, inactive}) => {
  const {student, totalStu, doneStu, pendStu, earned, expected, idx} = row;
  const initials = student.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const spct = expected > 0 ? Math.round((earned/expected)*100) : (student.plan==='monthly' ? 100 : 0);

  const overdueDays = !paymentStatus.paid && isBefore(paymentStatus.dueDate, today)
    ? differenceInDays(today, paymentStatus.dueDate)
    : 0;
  const showReminder = overdueDays > 0 && overdueDays % 3 === 0;
  const isOverdue = overdueDays > 0;

  const rawPhone = student.phone.replace(/\D/g, '');
  const waPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
  const pendingAmount = student.plan === 'monthly' ? student.value : Math.max(0, expected - earned);
  const monthName = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const waMessage = encodeURIComponent(
    `Olá, ${student.name.split(' ')[0]}! Tudo bem?\n\n` +
    `Passando para avisar que identificamos uma pendência financeira referente ao mês de ${monthName}.\n\n` +
    `💰 Valor: ${CUR(pendingAmount)}\n` +
    (overdueDays > 0 ? `📅 Dias em atraso: ${overdueDays} dias\n\n` : `\n`) +
    `Por favor, entre em contato para regularizar. 😊\n\n` +
    `_Esta é uma mensagem automática._`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  return (
    <div className={`rounded-xl p-4 transition-all ${inactive ? 'opacity-60' : ''}`}
      style={{
        background: paymentStatus.paid ? 'var(--success-light)' : isOverdue ? 'var(--error-light)' : 'var(--n-0)',
        border: paymentStatus.paid ? '1px solid var(--success)' : isOverdue ? '1px solid var(--error)' : '1px solid var(--n-200)'
      }}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-extrabold ${inactive?'grayscale':''}`}
          style={{background:'var(--accent-light)', color:'var(--accent)', border:'1.5px solid var(--accent)'}}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold truncate" style={{color:'var(--n-900)'}}>{student.name}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${student.plan==='monthly'?'text-blue-400':'text-purple-400'}`}
              style={{background: student.plan==='monthly' ? 'rgba(96,165,250,0.1)' : 'rgba(167,139,250,0.1)'}}>
              {student.plan==='monthly'?'Mensal':'Sessão'}
            </span>
            {inactive && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{color:'var(--n-500)',background:'var(--n-100)'}}>Inativo</span>}
            {student.isConsulting && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-orange-400" style={{background:'rgba(251,146,60,0.1)'}}>Consultoria</span>}
            {student.plan==='session' && !paymentStatus.paid && pendStu <= 2 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-amber-400" style={{background:'rgba(251,191,36,0.12)'}}>
                Faltam {pendStu} sessão{pendStu === 1 ? '' : 's'}
              </span>
            )}
            {paymentStatus.paid && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5" style={{background:'rgba(52,211,153,0.1)'}}><BadgeCheck size={9}/>Pago</span>}
            {isOverdue && !paymentStatus.paid && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-red-400 flex items-center gap-0.5" style={{background:'rgba(248,113,113,0.1)'}}><AlertTriangle size={9}/>{overdueDays}d atraso</span>}
          </div>
          <div className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>
            {student.plan==='monthly'
              ? (inactive
                ? 'Sem receita futura'
                : `${totalStu} sessões no mês · R$${student.value}/mês · Venc. dia ${(student.billingDay ?? 1).toString().padStart(2,'0')}`)
              : `${doneStu} de ${totalStu} sessões · R$${student.value}/sessão`}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base font-extrabold" style={{color: paymentStatus.paid ? 'var(--success)' : inactive ? 'var(--n-400)' : 'var(--success)'}}>{CUR(earned)}</div>
          {!inactive && student.plan==='session' && earned<expected && (
            <div className="text-[10px] text-amber-400 font-semibold">{CUR(expected-earned)} pend.</div>
          )}
        </div>
      </div>

      {showReminder && !paymentStatus.paid && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3" style={{background:'var(--error-light)',border:'1px solid var(--error)'}}>
          <AlertTriangle size={13} style={{color:'var(--error)'}} className="flex-shrink-0" />
          <span className="text-xs font-semibold" style={{color:'var(--error)'}}>Lembrete: {overdueDays} dias em atraso — envie uma mensagem ao cliente.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          {label:'Total',    value:totalStu,               color:''},
          {label:'Feitas',   value:doneStu,                color:''},
          {label:'Restantes',value:inactive ? 0 : pendStu, color:''},
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{background:'var(--n-50)',border:'1px solid var(--n-200)'}}>
            <div className={`text-base font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[10px]" style={{color:'var(--n-500)'}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1" style={{color:'var(--n-500)'}}>
          <span>{student.plan==='monthly' ? (inactive ? 'Inativo' : 'Mensalidade') : `${spct}% recebido`}</span>
          <span>{CUR(earned)} / {CUR(expected)}</span>
        </div>
        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{background:'var(--n-200)'}}>
          <div className="h-1.5 rounded-full transition-all duration-500" style={{width:`${Math.min(spct,100)}%`, background: inactive ? 'var(--n-400)' : paymentStatus.paid ? 'var(--success)' : 'var(--accent)'}}/>
        </div>
      </div>

      {!inactive && student.isActive && (
        <div className="flex gap-2">
          <button
            onClick={() => onTogglePaid(student.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all touch-manipulation"
            style={paymentStatus.paid
              ? {background:'var(--success-light)',color:'var(--success)'}
              : {background:'var(--n-100)',color:'var(--n-600)',border:'1px solid var(--n-200)'}}
          >
            <CheckCircle2 size={13} />
            {paymentStatus.paid ? 'Pago ✓' : 'Dar baixa'}
          </button>
          {!paymentStatus.paid && student.phone && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all touch-manipulation"
              style={{background:'#dcfce7',color:'#16a34a',border:'1px solid #bbf7d0'}}
            >
              <MessageCircle size={13} />
              WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
};

const Finance: React.FC = () => {
  const { canAccessFinance } = usePermissions();
  return (
    <FeatureGate
      allowed={canAccessFinance}
      feature="finance"
      title="Módulo Financeiro"
      description="Visualize receitas, pagamentos e o desempenho financeiro do seu negócio. Disponível no plano Premium."
    >
      <FinanceContent />
    </FeatureGate>
  );
};

export default Finance;
