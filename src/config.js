// src/config.js
// URL base del backend. Podés sobreescribirla con VITE_API_URL en .env
// Normalizamos: sin barra final, y si quedó :8000 en localhost lo pasamos a 80 (implícito).
function normalizeBaseUrl(raw) {
  const fallback = 'https://localhost'; // puerto 80 implícito
  if (!raw || typeof raw !== 'string') return fallback;

  let url = raw.trim().replace(/\/+$/,''); // sin barra al final

  // Si alguien dejó explícito el :8000, forzamos a localhost "normal" (80 implícito)
  if (url === 'https://localhost:8000' || url === 'https://127.0.0.1:8000') {
    return 'https://localhost';
  }

  return url;
}

const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || '');
export default API_URL;
