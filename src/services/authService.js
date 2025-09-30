// src/services/authService.js
import axios from 'axios'
import API_URL from '../config'

// Cliente axios con baseURL de la API (según tu Swagger: .../api/v1)
const client = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: false,
})

/** Setea/limpia el header Authorization para siguientes requests */
export function setAuthToken(token) {
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete client.defaults.headers.common['Authorization']
}

/** POST /auth/register/  -> { token, user } */
async function register(payload) {
  const { data } = await client.post('/auth/register/', payload)
  return data
}

/** POST /auth/login/ -> { token, user } */
async function login(payload) {
  const { data } = await client.post('/auth/login/', payload)
  return data
}

/** GET /auth/me/ -> User */
async function me() {
  const { data } = await client.get('/auth/me/')
  return data
}

export default {
  client,
  register,
  login,
  me,
  setAuthToken,
}
