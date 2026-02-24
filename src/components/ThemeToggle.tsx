import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'system':
        return <Monitor size={20} />;
      default:
        return <Sun size={20} />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Escuro';
      case 'system':
        return 'Sistema';
      default:
        return 'Claro';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-soft transition-all duration-200 touch-manipulation"
      title={`Tema: ${getLabel()}`}
    >
      <div className="transition-transform duration-300 hover:rotate-12 text-gray-600 dark:text-gray-300">
        {getIcon()}
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 hidden sm:inline">
        {getLabel()}
      </span>
    </button>
  );
};

export default ThemeToggle;
