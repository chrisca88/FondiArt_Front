// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as mock from '../../services/mockAuth.js'
import authService, { setAuthToken } from '../../services/authService.js'

const envMock = String(import.meta.env.VITE_MOCK_AUTH ?? '').toLowerCase()
const hasApiUrl = !!import.meta.env.VITE_API_URL
export const IS_MOCK =
  envMock === '1' || envMock === 'true' ? true
  : envMock === '0' || envMock === 'false' ? false
  : !hasApiUrl

const initialState = {
  token : localStorage.getItem('token') || null,
  user  : JSON.parse(localStorage.getItem('user') || 'null'),
  status: 'idle',
  error : null,
}

// Normaliza id y avatarUrl/avatar para el frontend
function normalizeUser(u) {
  if (!u) return u
  const id = u.id ?? u.user_id ?? u.userId ?? u.pk ?? u.uuid ?? u.uid ?? null
  const avatarUrl = u.avatarUrl ?? u.avatar ?? null
  const avatar    = u.avatar ?? avatarUrl ?? null
  return { ...u, id, avatarUrl, avatar }
}

// ✅ token en axios al boot
const bootToken = localStorage.getItem('token')
if (bootToken) setAuthToken(bootToken)

if (import.meta.env.DEV) {
  console.log('[authSlice] IS_MOCK =>', IS_MOCK, 'VITE_API_URL =>', import.meta.env.VITE_API_URL)
}

/* ============ THUNKS ============ */
export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue })=>{
  try{
    if (IS_MOCK) {
      const data = await mock.register(payload)
      if (import.meta.env.DEV) console.log('[register][MOCK] ->', data)
      return data
    }
    const data = await authService.register(payload) // { token, user }
    const user = normalizeUser(data?.user)
    if (data?.token) setAuthToken(data.token)
    if (data?.token) localStorage.setItem('token', data.token)
    if (user)        localStorage.setItem('user', JSON.stringify(user))
    if (import.meta.env.DEV) console.log('[register][REAL] token:', !!data?.token, 'user:', user)
    return { ...data, user }
  }catch(err){
    if (import.meta.env.DEV) console.error('[register] error', err?.response?.data || err.message)
    return rejectWithValue(err?.response?.data?.message || err.message || 'Error')
  }
})

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue })=>{
  try{
    if (IS_MOCK) {
      const data = await mock.login(payload)
      if (import.meta.env.DEV) console.log('[login][MOCK] ->', data)
      return data
    }
    const data = await authService.login(payload) // { token, user }
    const user = normalizeUser(data?.user)
    if (data?.token) setAuthToken(data.token)
    if (data?.token) localStorage.setItem('token', data.token)
    if (user)        localStorage.setItem('user', JSON.stringify(user))
    if (import.meta.env.DEV) console.log('[login][REAL] token:', !!data?.token, 'user:', user)
    return { ...data, user }
  }catch(err){
    if (import.meta.env.DEV) console.error('[login] error', err?.response?.data || err.message)
    return rejectWithValue(err?.response?.data?.message || err.message || 'Error')
  }
})

export const loginDemo = createAsyncThunk('auth/loginDemo', async (role, { rejectWithValue })=>{
  try{
    const data = await mock.loginDemo(role)
    if (import.meta.env.DEV) console.log('[loginDemo] ->', data)
    return data
  }catch(err){ return rejectWithValue(err.message || 'Error') }
})

export const loadUser = createAsyncThunk('auth/loadUser', async (_,_helpers)=>{
  if (IS_MOCK) {
    const u = await mock.getCurrent()
    if (import.meta.env.DEV) console.log('[loadUser][MOCK]', u)
    return u
  }
  const token = localStorage.getItem('token') || null
  if (token) setAuthToken(token)
  const user = await authService.me()
  const normalized = normalizeUser(user)
  if (import.meta.env.DEV) console.log('[loadUser][REAL] user:', normalized, 'hasToken:', !!token)
  return { token, user: normalized }
})

/** ✅ Guardar perfil (PATCH /users/me/) */
export const saveProfile = createAsyncThunk('auth/saveProfile', async (payload, { getState, rejectWithValue })=>{
  try{
    if (IS_MOCK) {
      const current = getState().auth.user || {}
      const updated = normalizeUser({ ...current, ...payload })
      await mock.updateMe?.(payload)
      return { user: updated }
    }
    // Mapeo seguro: si vino 'avatar' desde UI, convertir a 'avatarUrl'
    const apiPayload = {
      ...payload,
      avatarUrl: payload.avatarUrl ?? payload.avatar ?? null,
    }
    delete apiPayload.avatar // evitar enviar 'avatar' si el backend no lo conoce
    const data = await authService.updateMe(apiPayload)
    const user = normalizeUser(data)
    return { user }
  }catch(err){
    if (import.meta.env.DEV) console.error('[saveProfile] error', err?.response?.data || err.message)
    return rejectWithValue(err?.response?.data?.message || err.message || 'Error al guardar el perfil')
  }
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
      setAuthToken(null)
      if (import.meta.env.DEV) console.log('[logout] done.')
    },
    // (solo UI / demo) actualización local
    updateProfile(state, action){
      if (!state.user) return
      state.user = normalizeUser({ ...state.user, ...action.payload })
      localStorage.setItem('user', JSON.stringify(state.user))
      if (import.meta.env.DEV) console.log('[updateProfile] user:', state.user)
    },
  },
  extraReducers: (builder)=>{
    const fulfilled = (state, action)=>{
      state.status = 'succeeded'
      state.error  = null
      state.token  = action.payload?.token ?? state.token
      state.user   = normalizeUser(action.payload?.user ?? state.user)
      if (import.meta.env.DEV) console.log('[auth/fulfilled] user:', state.user, 'hasToken:', !!state.token)
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
        if (import.meta.env.DEV) console.log('[loadUser/fulfilled] user:', state.user, 'hasToken:', !!state.token)
      })
      .addCase(loadUser.rejected, rejected)

      // ✅ saveProfile -> actualiza store + localStorage
      .addCase(saveProfile.pending,  pending)
      .addCase(saveProfile.fulfilled, (state, action)=>{
        state.status = 'succeeded'
        state.error  = null
        if (action.payload?.user) {
          state.user = normalizeUser(action.payload.user)
          localStorage.setItem('user', JSON.stringify(state.user))
        }
      })
      .addCase(saveProfile.rejected, rejected)
  }
})

export const { logout, updateProfile } = authSlice.actions
export default authSlice.reducer
