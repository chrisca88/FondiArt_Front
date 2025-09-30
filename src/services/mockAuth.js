// src/services/mockAuth.js
const KEY = 'mock_users_v2';
const sleep = (ms = 200) => new Promise(r => setTimeout(r, ms));

/** Genera una dirección estilo 0x + 40 hex (mock; NO blockchain real) */
function genWalletAddress(seed = '') {
  const base = (seed || (Math.random().toString(36).slice(2) + Date.now())).toString();
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = ((hash << 5) - hash) + base.charCodeAt(i) | 0;
  const hex = (Math.abs(hash).toString(16).padStart(40, '0')).slice(0,40);
  return '0x' + hex;
}

const SEED_USERS = [
  // Cada seed recibe una walletAddress mock para pruebas
  { id: 'u-buyer',   name: 'Cliente Demo',   email: 'buyer@demo.com',   role: 'buyer',  password: 'buyer',  walletAddress: genWalletAddress('buyer@demo.com'),  dni: '', cbu: '' },
  { id: 'u-buyer2',  name: 'Cliente Demo 2', email: 'buyer2@demo.com',  role: 'buyer',  password: 'buyer2', walletAddress: genWalletAddress('buyer2@demo.com'), dni: '', cbu: '' },
  { id: 'u-artist',  name: 'Artista Demo',   email: 'artist@demo.com',  role: 'artist', password: 'artist', walletAddress: genWalletAddress('artist@demo.com'), dni: '', cbu: '' },
  { id: 'u-admin',   name: 'Admin Demo',     email: 'admin@demo.com',   role: 'admin',  password: 'admin',  walletAddress: genWalletAddress('admin@demo.com'),  dni: '', cbu: '' },
];

/**
 * Si no hay datos -> siembra todos los usuarios seed.
 * Si ya hay datos -> migra: asegura buyer2, agrega campos nuevos (dni/cbu) y wallet si faltara.
 */
function seedIfEmpty() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { list = []; }

  if (!list.length) {
    localStorage.setItem(KEY, JSON.stringify(SEED_USERS));
    return;
  }

  let changed = false;

  // Asegurar buyer2
  if (!list.some(u => u.email === 'buyer2@demo.com')) {
    list.push({
      id: 'u-buyer2',
      name: 'Cliente Demo 2',
      email: 'buyer2@demo.com',
      role: 'buyer',
      password: 'buyer2',
      walletAddress: genWalletAddress('buyer2@demo.com'),
      dni: '',
      cbu: '',
    });
    changed = true;
  }

  // Agregar campos faltantes / wallet si faltara
  list = list.map(u => {
    const v = { ...u };
    if (v.dni === undefined) { v.dni = ''; changed = true; }
    if (v.cbu === undefined) { v.cbu = ''; changed = true; }
    if (!v.walletAddress)    { v.walletAddress = genWalletAddress(v.email || v.id || 'seed'); changed = true; }
    return v;
  });

  if (changed) localStorage.setItem(KEY, JSON.stringify(list));
}

/** Garantiza que el usuario tenga wallet; si no, la crea y persiste. */
function ensureUserHasWallet(user, list) {
  if (!user.walletAddress) {
    user.walletAddress = genWalletAddress(user.email || user.id || 'seed');
    if (Array.isArray(list)) {
      const idx = list.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        const newList = [...list];
        newList[idx] = { ...newList[idx], walletAddress: user.walletAddress };
        localStorage.setItem(KEY, JSON.stringify(newList));
      }
    }
  }
  // Normalizar campos nuevos si faltaran
  if (user.dni === undefined) user.dni = '';
  if (user.cbu === undefined) user.cbu = '';
  return user;
}

function saveSession(user) {
  const token = `mock.${user.role}.${Date.now()}`;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
}

export async function register({ name, email, password, role = 'buyer' }) {
  seedIfEmpty();
  await sleep();
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (list.some(u => u.email === email)) throw new Error('El email ya está registrado');

  const user = {
    id: 'u' + Date.now(),
    name, email, role, password,
    walletAddress: genWalletAddress(email),
    dni: '',
    cbu: '',
  };
  list.push(user);
  localStorage.setItem(KEY, JSON.stringify(list));
  return saveSession(user);
}

export async function login({ email, password }) {
  seedIfEmpty();
  await sleep();
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const found = list.find(u => u.email === email && u.password === password);
  if (!found) throw new Error('Credenciales inválidas');
  const user = ensureUserHasWallet({ ...found }, list);
  return saveSession(user);
}

/** Login de demo por rol: 'buyer' | 'artist' | 'admin' */
export async function loginDemo(role = 'buyer') {
  seedIfEmpty();
  await sleep(150);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const found = list.find(u => u.role === role);
  if (!found) throw new Error('Demo no disponible para ese rol');
  const user = ensureUserHasWallet({ ...found }, list);
  return saveSession(user);
}

export async function getCurrent() {
  seedIfEmpty();
  await sleep(80);
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) throw new Error('No hay sesión');
  // Normalizar en sesión por si faltara algo
  if (!user.walletAddress) user.walletAddress = genWalletAddress(user.email || user.id || 'seed');
  if (user.dni === undefined) user.dni = '';
  if (user.cbu === undefined) user.cbu = '';
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
