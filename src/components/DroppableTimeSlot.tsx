import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Appointment } from '../types';
import DraggableAppointment from './DraggableAppointment';

interface DroppableTimeSlotProps {
  time: string;
  appointments: Appointment[];
  isWeekView?: boolean;
  isCompact?: boolean;
  onPressAppointment?: (apt: Appointment) => void;
  onAdd?: (time: string) => void;
}

const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({ 
  time, 
  appointments, 
  isWeekView = false,
  isCompact = false,
  onPressAppointment,
  onAdd,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: time,
    data: { time, accepts: ['appointment'] },
  });

  const hasAppointments = appointments.length > 0;

  if (isWeekView) {
    return (
      <div
        ref={setNodeRef}
        className="rounded-lg min-h-[40px] p-0.5 transition-all duration-150 group cursor-pointer"
        style={{
          background: isOver ? 'var(--accent-light)' : 'var(--n-0)',
          border: isOver ? '1.5px solid var(--accent)' : '1px solid var(--n-200)',
        }}
        onClick={() => !hasAppointments && onAdd?.(time)}
      >
        {appointments.map((apt) => (
          <DraggableAppointment key={apt.id} appointment={apt} isDragging={isOver} onPress={onPressAppointment} isCompact />
        ))}
        {!hasAppointments && (
          <div className="h-full min-h-[36px] flex items-center justify-center">
            {isOver ? (
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'var(--accent)'}} />
            ) : (
              <Plus size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" style={{color:'var(--n-500)'}} />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex gap-3 group rounded-lg px-2 py-1 transition-all duration-150 ${isOver ? '' : 'hover:bg-black/[0.01]'}`}
      style={isOver ? {background:'var(--accent-light)'} : {}}>
      {/* Time label */}
      <div className="w-12 sm:w-16 text-xs font-bold pt-3 flex-shrink-0 text-right" style={{color:'var(--n-600)'}}>
        {time}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg transition-all duration-150 cursor-pointer ${isCompact ? 'min-h-[44px] p-1.5' : 'min-h-[52px] p-2'}`}
        style={{
          border: isOver
            ? '1.5px solid var(--accent)'
            : hasAppointments
              ? '1px solid transparent'
              : '1px solid var(--n-200)',
          background: isOver 
            ? 'var(--accent-light)' 
            : hasAppointments 
              ? 'transparent' 
              : 'var(--n-0)',
        }}
        onClick={() => !hasAppointments && onAdd?.(time)}
      >
        {appointments.map((apt) => (
          <DraggableAppointment key={apt.id} appointment={apt} isDragging={isOver} onPress={onPressAppointment} isCompact={isCompact} />
        ))}

        {!hasAppointments && (
          <div
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${isOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            style={{
              background: isOver ? 'var(--accent)' : 'var(--accent-light)',
              border: '1.5px dashed var(--accent)',
            }}
          >
            <Plus size={14} style={{color: isOver ? '#fff' : 'var(--accent)'}} />
            <span className="text-xs font-semibold" style={{color: isOver ? '#fff' : 'var(--accent)'}}>Criar agendamento</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DroppableTimeSlot;
