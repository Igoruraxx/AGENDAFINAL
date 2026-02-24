import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

// Roteamento simples por pathname
const path = window.location.pathname;
const studentPortalMatch = path.match(/^\/s\/([a-f0-9-]{36})$/i);
const StudentPortal = React.lazy(() => import('./pages/StudentPortal'));

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    {studentPortalMatch ? (
      // Portal público — sem autenticação
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>}>
        <StudentPortal token={studentPortalMatch[1]} />
      </Suspense>
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>
);

let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});

if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: () => console.log('[PWA] App disponível offline!'),
    onUpdate: (registration) => {
      const waitingWorker = registration.waiting;
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      }
    },
  });
} else {
  console.log('[PWA] SW desativado em desenvolvimento para evitar cache antigo.');
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
