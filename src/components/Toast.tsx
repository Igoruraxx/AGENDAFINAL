import React, { useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} style={{color:'var(--success)'}} />;
      case 'error':
        return <X size={20} style={{color:'var(--error)'}} />;
      case 'warning':
        return <AlertCircle size={20} style={{color:'var(--warning)'}} />;
      case 'info':
        return <Info size={20} style={{color:'#3b82f6'}} />;
    }
  };

  const config = {
    success: {
      bg: '',
      border: 'border-green-200',
      icon: 'bg-green-100',
      bar: 'bg-green-500',
      text: '',
    },
    error: {
      bg: '',
      border: 'border-red-200',
      icon: 'bg-red-100',
      bar: 'bg-red-500',
      text: '',
    },
    warning: {
      bg: '',
      border: 'border-yellow-200',
      icon: 'bg-yellow-100',
      bar: 'bg-yellow-500',
      text: '',
    },
    info: {
      bg: '',
      border: 'border-blue-200',
      icon: 'bg-blue-100',
      bar: 'bg-blue-500',
      text: '',
    },
  }[type];

  return (
    <div
      className={`
        relative flex items-center gap-3 pl-3 pr-3 py-3 rounded-xl border shadow-lg
        overflow-hidden animate-slide-in-right max-w-xs w-full bg-white
        ${config.border}
      `}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.icon}`}>
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-medium leading-tight" style={{color:'var(--n-900)'}}>{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1.5 hover:bg-black/5 rounded-lg transition-colors flex-shrink-0"
      >
        <X size={14} style={{color:'var(--n-400)'}} />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${config.bar} opacity-60`}
        style={{ animation: `shrink ${duration}ms linear forwards` }}
      />
    </div>
  );
};

export default Toast;
