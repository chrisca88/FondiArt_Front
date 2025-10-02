// src/services/authService.js
import axios from 'axios'
import API_URL from '../config'

// Util para loguear parcialmente el token sin exponerlo
function maskToken(t) {
  if (!t) return '(none)'
  return t.slice(0, 10) + '…'
}

// Cliente axios con baseURL según tu Swagger: .../api/v1
const baseURL = `${API_URL.replace(/\/+$/, '')}/api/v1`
const client = axios.create({
  baseURL,
  withCredentials: false,
})

// ✅ Al cargar el servicio, si ya hay token guardado, lo ponemos en el header
const bootToken = localStorage.getItem('token')
if (bootToken) {
  client.defaults.headers.common['Authorization'] = `Bearer ${bootToken}`
}

// ---- LOGGING en dev ----
if (import.meta.env.DEV) {
  console.log('[authService] baseURL =>', baseURL)

  client.interceptors.request.use((config) => {
    // OJO: no loguear contraseñas en producción
    const clone = { ...config }
    const body = (clone.data && typeof clone.data === 'object')
      ? { ...clone.data, password: '***' }
      : clone.data
    const auth = clone.headers?.Authorization || client.defaults.headers?.Authorization
    console.log('[HTTP REQUEST]', clone.method?.toUpperCase(), clone.url, {
      data: body,
      hasAuthHeader: !!auth,
      authHeaderSample: auth ? maskToken(auth) : '(none)',
      baseURL: clone.baseURL || baseURL,
    })
    return config
  })

  client.interceptors.response.use(
    (res) => {
      console.log('[HTTP RESPONSE]', res.config?.url, res.status, res.data)
      return res
    },
    (err) => {
      console.error('[HTTP ERROR]', err?.config?.url, err?.response?.status, err?.response?.data || err.message)
      return Promise.reject(err)
    }
  )
}

/** Setea/limpia el header Authorization para siguientes requests */
export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    if (import.meta.env.DEV) console.log('[setAuthToken] SET', maskToken(`Bearer ${token}`))
  } else {
    delete client.defaults.headers.common['Authorization']
    if (import.meta.env.DEV) console.log('[setAuthToken] CLEARED')
  }
}

/** POST /auth/register/ -> { token, user } */
async function register(payload) {
  if (import.meta.env.DEV) console.log('[authService.register] payload', { ...payload, password: '***' })
  const { data } = await client.post('/auth/register/', payload)
  if (import.meta.env.DEV) console.log('[authService.register] response', data)
  return data
}

/** POST /auth/login/ -> { token, user } */
async function login(payload) {
  if (import.meta.env.DEV) console.log('[authService.login] payload', { ...payload, password: '***' })
  const { data } = await client.post('/auth/login/', payload)
  if (import.meta.env.DEV) console.log('[authService.login] response', data)
  return data
}

/** GET /auth/me/ -> User */
async function me() {
  const { data } = await client.get('/auth/me/')
  if (import.meta.env.DEV) console.log('[authService.me] user', data)
  return data
}

/** GET /users/<user_id>/wallet/ -> { address } */
async function getUserWalletAddress(userId) {
  if (!userId) throw new Error('Falta userId')
  if (import.meta.env.DEV) {
    const auth = client.defaults.headers?.Authorization
    console.log('[getUserWalletAddress] calling', `/users/${userId}/wallet/`, {
      userId,
      hasAuthHeader: !!auth,
      authHeaderSample: auth ? maskToken(auth) : '(none)',
      baseURL,
    })
  }
  const { data } = await client.get(`/users/${userId}/wallet/`)
  const addr =
    (typeof data === 'string' && data) ||
    data?.address ||
    data?.walletAddress ||
    data?.result?.address ||
    null
  if (import.meta.env.DEV) console.log('[getUserWalletAddress] raw response', data, 'parsed address:', addr)
  return { address: addr }
}

export default {
  client,
  register,
  login,
  me,
  setAuthToken,
  getUserWalletAddress,
}
