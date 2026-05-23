import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const productionOrigin = 'https://resume-builder-softbranes-projects.vercel.app';
const authPayload = `${window.location.search}${window.location.hash}`;
const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const hasSupabaseAuthPayload =
  authPayload.includes('access_token=') ||
  authPayload.includes('refresh_token=') ||
  authPayload.includes('type=signup') ||
  authPayload.includes('type=magiclink') ||
  authPayload.includes('code=');

if (isLocalHost && hasSupabaseAuthPayload) {
  window.location.replace(
    `${productionOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
