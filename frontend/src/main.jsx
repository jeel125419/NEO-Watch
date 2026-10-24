import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// When deployed to production (e.g. on Vercel), route /api requests to Render backend if VITE_API_BASE_URL is set
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(`${apiBase}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
