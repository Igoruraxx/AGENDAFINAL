import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { CalendarDays } from 'lucide-react';
import BottomNavigation from './components/BottomNavigation';
import ToastContainer from './components/ToastContainer';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import { useToast } from './hooks/useToast';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Lazy loading: cada página só é carregada quando necessária
const Schedule     = lazy(() => import('./pages/Schedule'));
const Students     = lazy(() => import('./pages/Students'));
const Evolution    = lazy(() => import('./pages/Evolution'));
const UserPanel    = lazy(() => import('./pages/UserPanel'));
const AdminPanel   = lazy(() => import('./pages/AdminPanel'));
const Finance      = lazy(() => import('./pages/Finance'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-40">
    <div className="spinner" />
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [animKey, setAnimKey] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const { toasts, removeToast } = useToast();
  const { isAdmin, isAuthenticated, loading, authScreen } = useAuth();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setAnimKey(k => k + 1);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'schedule':   return <Schedule />;
      case 'students':   return <Students />;
      case 'evolution':  return <Evolution />;
      case 'user':       return <UserPanel />;
      case 'finance':    return <Finance />;
      case 'admin':      return isAdmin ? <AdminPanel /> : <Schedule />;
      default:           return <Schedule />;
    }
  };

  // Splash screen enquanto verifica sessão Supabase
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--n-100)' }}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}
        >
          <CalendarDays size={28} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="text-center leading-none">
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, var(--accent), #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>
            FITPRO
          </span>
          <span className="block text-xs font-bold tracking-wider mt-0.5" style={{ color: 'var(--n-500)' }}>
            AGENDA PERSONAL
          </span>
        </div>
        <div className="spinner mt-4" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        {authScreen === 'login'    && <Login />}
        {authScreen === 'register' && <Register />}
        {authScreen === 'forgot'   && <ForgotPassword />}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--n-100)' }}>
      <OfflineBanner />
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 max-w-lg mx-auto safe-area-pt"
        style={{ background: 'var(--n-0)', borderBottom: '1px solid var(--n-200)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}
          >
            <CalendarDays size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="text-lg font-extrabold tracking-tight" style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, var(--accent), #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900, letterSpacing: '-0.02em', paddingRight: '2px' }}>
              FITPRO
            </span>
            <span className="block text-[10px] font-bold tracking-wider" style={{ color: 'var(--n-500)', marginTop: '-1px' }}>
              AGENDA PERSONAL
            </span>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        className="relative z-10 max-w-lg mx-auto overflow-y-auto"
        style={{ 
          height: '100dvh', 
          scrollBehavior: 'smooth', 
          paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))', 
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' 
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <div key={animKey} className="animate-fade-in-up min-h-full">
            {renderActiveTab()}
          </div>
        </Suspense>
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAdmin={isAdmin}
      />
      <InstallPrompt />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
