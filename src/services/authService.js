// src/services/authService.js
import axios from 'axios'
import API_URL from '../config'

// Cliente axios con baseURL según tu Swagger: .../api/v1
const client = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: false,
})

// Interceptores de LOG (solo en dev)
if (import.meta.env.DEV) {
  client.interceptors.request.use((config) => {
    // OJO: no loguear contraseñas en producción
    const clone = { ...config }
    const body = (clone.data && typeof clone.data === 'object')
      ? { ...clone.data, password: '***' }
      : clone.data
    // eslint-disable-next-line no-console
    console.log('[HTTP REQUEST]', clone.method?.toUpperCase(), clone.url, { data: body })
    return config
  })
  client.interceptors.response.use(
    (res) => {
      // eslint-disable-next-line no-console
      console.log('[HTTP RESPONSE]', res.config?.url, res.status, res.data)
      return res
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[HTTP ERROR]', err?.config?.url, err?.response?.status, err?.response?.data || err.message)
      return Promise.reject(err)
    }
  )
}

/** Setea/limpia el header Authorization para siguientes requests */
export function setAuthToken(token) {
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete client.defaults.headers.common['Authorization']
}

/** POST /auth/register/ -> { token, user } */
async function register(payload) {
  // eslint-disable-next-line no-console
  console.log('[authService.register] payload', { ...payload, password: '***' })
  const { data } = await client.post('/auth/register/', payload)
  // eslint-disable-next-line no-console
  console.log('[authService.register] response', data)
  return data
}

/** POST /auth/login/ -> { token, user } */
async function login(payload) {
  // eslint-disable-next-line no-console
  console.log('[authService.login] payload', { ...payload, password: '***' })
  const { data } = await client.post('/auth/login/', payload)
  // eslint-disable-next-line no-console
  console.log('[authService.login] response', data)
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
