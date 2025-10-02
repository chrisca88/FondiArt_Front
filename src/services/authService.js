// src/services/authService.js
import axios from 'axios'
import API_URL from '../config'

function maskToken(t) { return t ? t.slice(0, 10) + '…' : '(none)' }

const baseURL = `${API_URL.replace(/\/+$/, '')}/api/v1`
const client = axios.create({ baseURL, withCredentials: false })

// Token pegado al arrancar
const bootToken = localStorage.getItem('token')
if (bootToken) client.defaults.headers.common['Authorization'] = `Bearer ${bootToken}`

if (import.meta.env.DEV) {
  console.log('[authService] baseURL =>', baseURL)
  client.interceptors.request.use((config) => {
    const body = (config.data instanceof FormData)
      ? '(FormData)'
      : (typeof config.data === 'object' ? { ...config.data, password: '***' } : config.data)
    const auth = config.headers?.Authorization || client.defaults.headers?.Authorization
    console.log('[HTTP REQUEST]', config.method?.toUpperCase(), config.url, {
      data: body,
      hasAuthHeader: !!auth,
      authHeaderSample: auth ? maskToken(auth) : '(none)',
      baseURL: config.baseURL || baseURL,
    })
    return config
  })
  client.interceptors.response.use(
    (res) => { console.log('[HTTP RESPONSE]', res.config?.url, res.status, res.data); return res },
    (err) => { console.error('[HTTP ERROR]', err?.config?.url, err?.response?.status, err?.response?.data || err.message); return Promise.reject(err) }
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
  const { data } = await client.post('/auth/register/', payload); return data
}
async function login(payload) {
  const { data } = await client.post('/auth/login/', payload); return data
}
async function me() {
  const { data } = await client.get('/auth/me/'); return data
}
async function updateMe(payload) {
  const { data } = await client.patch('/users/me/', payload)
  return data?.user ?? data
}

// Asegura que el Authorization esté seteado (por si algo lo perdió)
function ensureAuthHeader(){
  const h = client.defaults.headers?.common?.Authorization
  if (!h) {
    const t = localStorage.getItem('token')
    if (t) {
      client.defaults.headers.common['Authorization'] = `Bearer ${t}`
      if (import.meta.env.DEV) console.log('[ensureAuthHeader] restored Authorization from LS:', maskToken(`Bearer ${t}`))
    }
  }
}

/**
 * POST /upload/ — sube a Cloudinary vía backend.
 * No seteamos Content-Type manualmente para no romper el boundary.
 */
async function uploadImage(file, options = {}, onProgress) {
  if (!file) throw new Error('Falta el archivo')
  ensureAuthHeader()

  const fd = new FormData()
  fd.append('file', file)
  if (options.folder) fd.append('folder', options.folder)
  if (options.public_id) fd.append('public_id', options.public_id)
  if (options.tags) fd.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : String(options.tags))
  if (options.transformation) {
    fd.append('transformation', typeof options.transformation === 'string'
      ? options.transformation
      : JSON.stringify(options.transformation))
  }

  const { data } = await client.post('/upload/', fd, {
    // NO forzar Content-Type; axios lo arma con boundary
    onUploadProgress: (evt) => {
      if (!onProgress || !evt.total) return
      const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100))
      onProgress(pct)
    }
  })

  const url =
    data?.secure_url ||
    data?.url ||
    data?.result?.secure_url ||
    data?.data?.secure_url ||
    null

  if (import.meta.env.DEV) console.log('[uploadImage] response', data, '-> url:', url)
  return { url }
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
  uploadImage,
  getUserWalletAddress,
}
