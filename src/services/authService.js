// src/services/authService.js
import axios from 'axios'
import API_URL from '../config'

function maskToken(t) {
  if (!t) return '(none)'
  return t.slice(0, 10) + '…'
}

const baseURL = `${API_URL.replace(/\/+$/, '')}/api/v1`
const client = axios.create({
  baseURL,
  withCredentials: false,
})

const bootToken = localStorage.getItem('token')
if (bootToken) {
  client.defaults.headers.common['Authorization'] = `Bearer ${bootToken}`
}

if (import.meta.env.DEV) {
  console.log('[authService] baseURL =>', baseURL)

  client.interceptors.request.use((config) => {
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

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    if (import.meta.env.DEV) console.log('[setAuthToken] SET', maskToken(`Bearer ${token}`))
  } else {
    delete client.defaults.headers.common['Authorization']
    if (import.meta.env.DEV) console.log('[setAuthToken] CLEARED')
  }
}

async function register(payload) {
  if (import.meta.env.DEV) console.log('[authService.register] payload', { ...payload, password: '***' })
  const { data } = await client.post('/auth/register/', payload)
  if (import.meta.env.DEV) console.log('[authService.register] response', data)
  return data
}

async function login(payload) {
  if (import.meta.env.DEV) console.log('[authService.login] payload', { ...payload, password: '***' })
  const { data } = await client.post('/auth/login/', payload)
  if (import.meta.env.DEV) console.log('[authService.login] response', data)
  return data
}

async function me() {
  const { data } = await client.get('/auth/me/')
  if (import.meta.env.DEV) console.log('[authService.me] user', data)
  return data
}

/** PATCH /users/me/ -> devuelve el usuario actualizado (o { user }) */
async function updateMe(payload) {
  const { data } = await client.patch('/users/me/', payload)
  if (import.meta.env.DEV) console.log('[authService.updateMe] response', data)
  return data?.user ?? data
}

async function getUserWalletAddress(userId) {
  if (!userId) throw new Error('Falta userId')
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
  updateMe,
  setAuthToken,
  getUserWalletAddress,
}
