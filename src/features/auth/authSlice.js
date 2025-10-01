// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as mock from '../../services/mockAuth.js'
import authService, { setAuthToken } from '../../services/authService.js'

// Si NO se explicitó VITE_MOCK_AUTH, pero HAY VITE_API_URL, por defecto usamos backend real.
const envMock = String(import.meta.env.VITE_MOCK_AUTH ?? '').toLowerCase()
const hasApiUrl = !!import.meta.env.VITE_API_URL
const isMock =
  envMock === '1' || envMock === 'true' ? true
  : envMock === '0' || envMock === 'false' ? false
  : !hasApiUrl // si hay API_URL → real; si no hay → mock

const initialState = {
  token : localStorage.getItem('token') || null,
  user  : JSON.parse(localStorage.getItem('user') || 'null'),
  status: 'idle',
  error : null,
}

// ✅ Normaliza el objeto usuario para garantizar user.id
function normalizeUser(u) {
  if (!u) return u
  const id = u.id ?? u.user_id ?? u.userId ?? u.pk ?? u.uuid ?? u.uid ?? null
  return { ...u, id }
}

// ✅ Al cargar el slice, si ya había token, lo colocamos en axios
const bootToken = localStorage.getItem('token')
if (bootToken) setAuthToken(bootToken)

/* ============ THUNKS ============ */
export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue })=>{
  try{
    if (isMock) {
      const data = await mock.register(payload)
      return data
    }
    // Backend real
    const data = await authService.register(payload) // { token, user }
    const user = normalizeUser(data?.user)
    if (data?.token) setAuthToken(data.token)
    if (data?.token) localStorage.setItem('token', data.token)
    if (user)        localStorage.setItem('user', JSON.stringify(user))
    return { ...data, user }
  }catch(err){
    return rejectWithValue(err?.response?.data?.message || err.message || 'Error')
  }
})

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue })=>{
  try{
    if (isMock) {
      const data = await mock.login(payload)
      return data
    }
    // Backend real
    const data = await authService.login(payload) // { token, user }
    const user = normalizeUser(data?.user)
    if (data?.token) setAuthToken(data.token)                 // ✅ pone Authorization
    if (data?.token) localStorage.setItem('token', data.token)
    if (user)        localStorage.setItem('user', JSON.stringify(user))
    return { ...data, user }
  }catch(err){
    return rejectWithValue(err?.response?.data?.message || err.message || 'Error')
  }
})

export const loginDemo = createAsyncThunk('auth/loginDemo', async (role, { rejectWithValue })=>{
  try{
    return await mock.loginDemo(role)
  }catch(err){ return rejectWithValue(err.message || 'Error') }
})

export const loadUser = createAsyncThunk('auth/loadUser', async (_,_helpers)=>{
  if (isMock) {
    return await mock.getCurrent()
  }
  // Backend real: intenta cargar el perfil con el token guardado
  const token = localStorage.getItem('token') || null
  if (token) setAuthToken(token) // ✅ asegura header tras refresh
  const user = await authService.me() // devuelve User
  const normalized = normalizeUser(user)
  return { token, user: normalized }
})

/* ============ SLICE ============ */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state){
      state.token  = null
      state.user   = null
      state.status = 'idle'
      state.error  = null
      try { mock.logout?.() } catch {}
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setAuthToken(null) // ✅ limpia el header Authorization
    },
    // Actualiza campos del perfil (mock) y persiste en localStorage
    updateProfile(state, action){
      if (!state.user) return
      state.user = normalizeUser({ ...state.user, ...action.payload })
      localStorage.setItem('user', JSON.stringify(state.user))
    },
  },
  extraReducers: (builder)=>{
    const fulfilled = (state, action)=>{
      state.status = 'succeeded'
      state.error  = null
      state.token  = action.payload?.token ?? state.token
      state.user   = normalizeUser(action.payload?.user ?? state.user)
    }
    const pending  = (state)=>{ state.status = 'loading'; state.error = null }
    const rejected = (state, action)=>{ state.status = 'failed'; state.error = action.payload || 'Error' }

    builder
      .addCase(register.pending,  pending)
      .addCase(register.fulfilled, fulfilled)
      .addCase(register.rejected, rejected)

      .addCase(login.pending,  pending)
      .addCase(login.fulfilled, fulfilled)
      .addCase(login.rejected, rejected)

      .addCase(loginDemo.pending,  pending)
      .addCase(loginDemo.fulfilled, fulfilled)
      .addCase(loginDemo.rejected, rejected)

      .addCase(loadUser.pending,  pending)
      .addCase(loadUser.fulfilled, (state, action)=>{
        state.status = 'succeeded'
        state.error  = null
        if (action.payload){
          state.token = action.payload.token ?? state.token
          state.user  = normalizeUser(action.payload.user  ?? state.user)
        }
      })
      .addCase(loadUser.rejected, rejected)
  }
})

export const { logout, updateProfile } = authSlice.actions
export default authSlice.reducer
