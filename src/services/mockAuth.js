// src/services/mockAuth.js
const USERS_KEY = 'mock_users';
const TOKEN_KEY = 'token';
const USER_KEY  = 'user';

const sleep = (ms=500) => new Promise(r => setTimeout(r, ms));

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

export async function register({ name, email, password, role='buyer' }){
  await sleep();
  const users = getUsers();
  if (users.some(u => u.email === email)) {
    throw new Error('El email ya está registrado');
  }
  const user = { id: crypto.randomUUID?.() || String(Date.now()), name, email, role };
  users.push({ ...user, password });
  saveUsers(users);
  const token = `mock.${btoa(email)}.${Date.now()}`;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token, user };
}

export async function login({ email, password }){
  await sleep();
  const users = getUsers();
  const row = users.find(u => u.email === email && u.password === password);
  if (!row) throw new Error('Credenciales inválidas');
  const { password: _pw, ...user } = row;
  const token = `mock.${btoa(email)}.${Date.now()}`;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token, user };
}

export async function loginDemo(role='buyer'){
  await sleep(350);
  const email = role === 'artist' ? 'artist@demo.local' : 'buyer@demo.local';
  const name  = role === 'artist' ? 'Artista Demo' : 'Comprador Demo';
  const password = 'demo';
  let users = getUsers();
  if (!users.some(u => u.email === email)) {
    users.push({ id: String(Date.now()), name, email, password, role });
    saveUsers(users);
  }
  return login({ email, password });
}

export async function getCurrent(){
  await sleep(150);
  const token = localStorage.getItem(TOKEN_KEY);
  const user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  if (!token || !user) throw new Error('No autenticado');
  return { token, user };
}

export function logout(){
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
