import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { debug, installGlobalErrorHandlers } from './lib/debug';
import { migrateLegacyStorageKeys } from './lib/appMeta';
import './styles/theme.css';

migrateLegacyStorageKeys();
installGlobalErrorHandlers();
debug('boot', 'main.tsx loading');

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
    debug('boot', 'cleared service workers in dev');
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

debug('boot', 'React mounted');
