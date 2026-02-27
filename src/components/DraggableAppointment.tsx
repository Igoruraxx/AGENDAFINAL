import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Appointment } from '../types';

const MUSCLE_EMOJIS: Record<string, string> = {
  peito: '🫁', costas: '🔙', ombros: '🏋️', biceps: '💪', triceps: '🦾',
  quadriceps: '🦵', posterior: '🦿', gluteos: '🍑', panturrilha: '🦶',
  abdomen: '⚡', trapezio: '🔺', antebraco: '🤜', full_body: '🔥',
};

const MUSCLE_SHORT: Record<string, string> = {
  peito: 'Peit', costas: 'Cost', ombros: 'Ombr', biceps: 'Bic', triceps: 'Tri',
  quadriceps: 'Quad', posterior: 'Post', gluteos: 'Glt', panturrilha: 'Pant',
  abdomen: 'Abd', trapezio: 'Trap', antebraco: 'Antb', full_body: 'Full',
};

interface DraggableAppointmentProps {
  appointment: Appointment;
  isDragging?: boolean;
  onPress?: (apt: Appointment) => void;
  isCompact?: boolean;
}

const DraggableAppointment: React.FC<DraggableAppointmentProps> = ({ 
  appointment, 
  isDragging = false,
  onPress,
  isCompact = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: appointment.id,
    data: { appointment },
  });

  const pointerMoved = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isCurrentlyDragging ? 100 : undefined,
  } : undefined;

  // Esconder o card original enquanto arrasta (o DragOverlay mostra a prévia)
  const styleWithDragging = isCurrentlyDragging ? { ...style, opacity: 0 } : style;

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerMoved.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerMoved.current) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - startPos.current.x, 2) + 
        Math.pow(e.clientY - startPos.current.y, 2)
      );
      if (dist > 10) pointerMoved.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerMoved.current && onPress) {
      e.preventDefault();
      e.stopPropagation();
      onPress(appointment);
    }
  };

  const muscles = appointment.muscleGroups || [];

  const initials = appointment.studentName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const displayName = appointment.studentName.split(' ').slice(0, 2).join(' ');
  const displayFirstName = appointment.studentName.split(' ')[0];

  const FEMALE_NAMES_LIST = ['ana','maria','fernanda','julia','juliana','camila','beatriz','larissa','amanda','patricia','gabriela','leticia','isabela','isabel','bruna','natalia','renata','vanessa','claudia','mariana','carolina','aline','alice','laura','sofia','valentina','helena','bianca','priscila','luciana'];
  const isFem = FEMALE_NAMES_LIST.includes(displayFirstName.toLowerCase());
  const avatarBg = isFem ? 'rgba(56,189,248,0.15)' : 'rgba(30,64,175,0.15)';
  const avatarColor = isFem ? '#0ea5e9' : '#1e40af';

  const endHour = appointment.time
    ? (() => {
        const [h, m] = appointment.time.split(':').map(Number);
        const totalMin = h * 60 + m + appointment.duration;
        return `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
      })()
    : null;

  const cardStyle: React.CSSProperties = {
    ...styleWithDragging,
    background: 'var(--n-0)',
    border: '1px solid var(--n-200)',
    boxShadow: 'var(--sh-xs)',
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...listeners}
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`
        relative ${isCompact ? 'px-2 py-1.5' : 'px-2.5 py-2'} rounded-lg mb-1 cursor-grab active:cursor-grabbing
        transition-all duration-150 touch-manipulation select-none
        ${isCurrentlyDragging ? 'rotate-1 scale-105 opacity-80' : 'hover:shadow-md hover:-translate-y-0.5'}
        ${isDragging ? 'opacity-40' : ''}
        ${appointment.sessionDone ? 'opacity-50' : ''}
      `}
    >
      {appointment.sessionDone && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{background:'var(--success-light)'}}>
          <CheckCircle2 size={10} style={{color:'var(--success)'}} />
        </div>
      )}
      {isCompact ? (
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 font-bold text-[10px]"
            style={{background: avatarBg, color: avatarColor}}
          >
            {displayFirstName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-[11px] truncate leading-tight ${appointment.sessionDone ? 'line-through' : ''}`} style={{color:'var(--n-900)'}}>
              {displayFirstName}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs"
            style={{background: avatarBg, color: avatarColor}}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-bold text-sm truncate leading-tight ${appointment.sessionDone ? 'line-through' : ''}`} style={{color:'var(--n-900)'}}>
              {displayName}
            </div>
            {muscles.length > 0 ? (
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {muscles.slice(0, 4).map(m => (
                  <span key={m} className="flex items-center gap-0.5 rounded px-1 py-0.5" style={{background:'var(--n-100)'}}>
                    <span className="text-[9px] leading-none">{MUSCLE_EMOJIS[m] ?? ''}</span>
                    <span className="text-[9px] font-medium leading-none" style={{color:'var(--n-600)'}}>{MUSCLE_SHORT[m] ?? m.slice(0,4)}</span>
                  </span>
                ))}
                {muscles.length > 4 && <span className="text-[9px]" style={{color:'var(--n-400)'}}>+{muscles.length - 4}</span>}
              </div>
            ) : endHour ? (
              <div className="flex items-center gap-1 text-xs mt-0.5" style={{color:'var(--n-400)'}}>
                <Clock size={9} />
                <span>{appointment.time} – {endHour}</span>
              </div>
            ) : null}
          </div>
          <div className="text-xs flex-shrink-0 rounded-md px-1.5 py-0.5 font-semibold" style={{background:'var(--n-100)',color:'var(--accent)'}}>
            {appointment.duration}m
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableAppointment;
