import React from 'react';
import Toast from './Toast';

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  const visible = toasts.slice(-3);
  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {visible.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={onClose}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
