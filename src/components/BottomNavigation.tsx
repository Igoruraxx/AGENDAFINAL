import React from 'react';
import { Calendar, Users, TrendingUp, User, Settings, DollarSign } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange, isAdmin }) => {
  const tabs = [
    { id: 'schedule', icon: Calendar, label: 'Agenda' },
    { id: 'students', icon: Users, label: 'Clientes' },
    { id: 'evolution', icon: TrendingUp, label: 'Evolução' },
    { id: 'finance', icon: DollarSign, label: 'Finanças' },
    { id: 'user', icon: User, label: 'Perfil' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', icon: Settings, label: 'Admin' });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
      style={{ background: 'var(--n-0)', borderTop: '1px solid var(--n-200)' }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto px-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 transition-all duration-120 touch-manipulation active:scale-95"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className="p-1.5 rounded-lg transition-all duration-120"
                style={{ background: isActive ? 'var(--accent-light)' : 'transparent' }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--n-400)' }}
                />
              </div>
              <span
                className="font-semibold leading-none transition-all duration-120"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--n-400)',
                  fontSize: '0.625rem',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
