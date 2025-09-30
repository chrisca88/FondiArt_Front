// src/config.js
// URL base del backend. Podés sobreescribirla con VITE_API_URL en .env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export default API_URL;
