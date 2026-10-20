import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PwaControls } from './components/PwaControls';

createRoot(document.getElementById('root')!).render(<><PwaControls/><App /></>);

// Development remains free of service workers and stale worker caches.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  const register = () => { void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
    console.warn('A instalação offline do FinPulse está indisponível. O site continua acessível online.');
  }); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
