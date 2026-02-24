import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-semibold text-white animate-fade-in"
      style={{
        background: isOnline ? 'var(--success)' : 'var(--n-700)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)',
      }}
    >
      {isOnline ? (
        <>
          <Wifi size={14} />
          Conexão restaurada
        </>
      ) : (
        <>
          <WifiOff size={14} />
          Você está offline
        </>
      )}
    </div>
  );
}
