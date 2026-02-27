import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':  return <Sun  size={16} />;
      case 'dark':   return <Moon size={16} />;
      case 'system': return <Monitor size={16} />;
      default:       return <Sun  size={16} />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':  return 'Claro';
      case 'dark':   return 'Escuro';
      case 'system': return 'Auto';
      default:       return 'Claro';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-95"
      style={{
        background: 'var(--n-100)',
        border: '1px solid var(--n-200)',
        color: 'var(--n-600)',
      }}
      title={`Tema: ${getLabel()}`}
      aria-label={`Alternar tema — atual: ${getLabel()}`}
    >
      <span style={{ display: 'flex', transition: 'transform 300ms' }}>
        {getIcon()}
      </span>
      <span className="text-xs font-semibold hidden xs:inline" style={{ color: 'var(--n-600)' }}>
        {getLabel()}
      </span>
    </button>
  );
};

export default ThemeToggle;
