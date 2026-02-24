import React from 'react';
import { CalendarDays } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--n-100)' }}>
      {/* Logo header */}
      <div className="flex justify-center pt-14 pb-6">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)', boxShadow: 'var(--sh-md)' }}
          >
            <CalendarDays size={32} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--n-900)' }}>
              <span style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, var(--accent), #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900, letterSpacing: '-0.02em', fontSize: '2.25rem', paddingRight: '4px' }}>FITPRO</span>
            </h1>
            <p className="text-sm font-bold tracking-wide mt-0.5" style={{ color: 'var(--n-500)' }}>
              AGENDA PERSONAL
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--n-400)' }}>
              Gestão inteligente de agendamentos
            </p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-8 pt-2">
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'var(--n-0)',
              border: '1px solid var(--n-200)',
              boxShadow: 'var(--sh-lg)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
