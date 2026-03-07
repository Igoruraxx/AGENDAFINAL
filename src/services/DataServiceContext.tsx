/**
 * DataServiceContext — injects the active data-service bundle into the React tree.
 *
 * The implementation is selected at startup based on the environment:
 *   - REACT_APP_DATA_SERVICE=local  → LocalStorage (offline-first, no Supabase needed)
 *   - REACT_APP_DATA_SERVICE=supabase (default) → Supabase backend
 *
 * This lets the entire app run without a database during development or demos,
 * and makes it trivial to swap in a different backend in the future.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { IDataServices } from './IDataService';
import {
  LocalStudentService,
  LocalAppointmentService,
  LocalPaymentService,
  LocalEvolutionService,
} from './local/LocalDataService';
import {
  SupabaseStudentService,
  SupabaseAppointmentService,
  SupabasePaymentService,
  SupabaseEvolutionService,
} from './supabase/SupabaseDataService';

// ── Context ───────────────────────────────────────────────────────────────────

const DataServiceContext = createContext<IDataServices | null>(null);

// ── Service factory ───────────────────────────────────────────────────────────

function createServices(backend: 'local' | 'supabase'): IDataServices {
  if (backend === 'local') {
    return {
      students:     new LocalStudentService(),
      appointments: new LocalAppointmentService(),
      payments:     new LocalPaymentService(),
      evolution:    new LocalEvolutionService(),
    };
  }
  return {
    students:     new SupabaseStudentService(),
    appointments: new SupabaseAppointmentService(),
    payments:     new SupabasePaymentService(),
    evolution:    new SupabaseEvolutionService(),
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface DataServiceProviderProps {
  children: React.ReactNode;
  /** Override the backend selection (useful in tests). */
  backend?: 'local' | 'supabase';
}

export const DataServiceProvider: React.FC<DataServiceProviderProps> = ({ children, backend }) => {
  const resolvedBackend =
    backend ??
    ((process.env.REACT_APP_DATA_SERVICE === 'local' ? 'local' : 'supabase') as 'local' | 'supabase');

  // Services are stable for the lifetime of the provider.
  const services = useMemo(() => createServices(resolvedBackend), [resolvedBackend]);

  return (
    <DataServiceContext.Provider value={services}>
      {children}
    </DataServiceContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDataServices(): IDataServices {
  const ctx = useContext(DataServiceContext);
  if (!ctx) throw new Error('useDataServices must be used within DataServiceProvider');
  return ctx;
}
