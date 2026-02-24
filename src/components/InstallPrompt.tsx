import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function InstallPrompt() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  const handleInstall = async () => {
    const accepted = await install();
    if (!accepted) setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-in-up">
      <div
        className="flex items-center gap-3 p-4 rounded-2xl"
        style={{
          background: 'var(--n-0)',
          border: '1px solid var(--n-200)',
          boxShadow: 'var(--sh-lg)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', color: 'var(--n-0)' }}
        >
          <Smartphone size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--n-900)', margin: 0 }}>
            Instalar FitPro
          </p>
          <p className="text-xs" style={{ color: 'var(--n-500)', margin: 0 }}>
            Acesse direto da tela inicial
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="btn btn-primary flex items-center gap-1.5"
          style={{ padding: '0.5rem 1rem', minHeight: '36px', fontSize: '0.75rem' }}
        >
          <Download size={14} />
          Instalar
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--n-400)' }}
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
