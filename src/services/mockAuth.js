// src/services/mockAuth.js
const KEY = 'mock_users_v2';
const sleep = (ms = 200) => new Promise(r => setTimeout(r, ms));

const SEED_USERS = [
  { id: 'u-buyer',  name: 'Cliente Demo',  email: 'buyer@demo.com',  role: 'buyer',  password: 'buyer'  },
  { id: 'u-artist', name: 'Artista Demo',  email: 'artist@demo.com', role: 'artist', password: 'artist' },
  { id: 'u-admin',  name: 'Admin Demo',    email: 'admin@demo.com',  role: 'admin',  password: 'admin'  },
];

function seedIfEmpty() {
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, JSON.stringify(SEED_USERS));
  }
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

  const user = { id: 'u' + Date.now(), name, email, role, password };
  list.push(user);
  localStorage.setItem(KEY, JSON.stringify(list));
  return saveSession(user);
}

export async function login({ email, password }) {
  seedIfEmpty();
  await sleep();
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const user = list.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Credenciales inválidas');
  return saveSession(user);
}

/** Login de demo por rol: 'buyer' | 'artist' | 'admin' */
export async function loginDemo(role = 'buyer') {
  seedIfEmpty();
  await sleep(150);
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const user = list.find(u => u.role === role);
  if (!user) throw new Error('Demo no disponible para ese rol');
  return saveSession(user);
}

export async function getCurrent() {
  seedIfEmpty();
  await sleep(80);
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) throw new Error('No hay sesión');
  return { token, user };
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
