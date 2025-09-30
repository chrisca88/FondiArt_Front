// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as mock from '../../services/mockAuth.js'
import authService, { setAuthToken } from '../../services/authService.js'

const isMock =
  String(import.meta.env.VITE_MOCK_AUTH ?? '1').toLowerCase() !== '0' &&
  String(import.meta.env.VITE_MOCK_AUTH ?? '1').toLowerCase() !== 'false'

const initialState = {
  token : localStorage.getItem('token') || null,
  user  : JSON.parse(localStorage.getItem('user') || 'null'),
  status: 'idle',
  error : null,
}

/* ============ THUNKS ============ */
export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue })=>{
  try{
    if (isMock) {
      // eslint-disable-next-line no-console
      console.log('[auth/register][MOCK] payload', { ...payload, password: '***' })
      const data = await mock.register(payload)
      // eslint-disable-next-line no-console
      console.log('[auth/register][MOCK] response', data)
      return data
    }
    // Backend real
    // eslint-disable-next-line no-console
    console.log('[auth/register][REAL] payload', { ...payload, password: '***' })
    const data = await authService.register(payload) // { token, user }
    // eslint-disable-next-line no-console
    console.log('[auth/register][REAL] response', data)
    if (data?.token) setAuthToken(data.token)
    if (data?.token) localStorage.setItem('token', data.token)
    if (data?.user)  localStorage.setItem('user', JSON.stringify(data.user))
    return data
  }catch(err){
    // eslint-disable-next-line no-console
    console.error('[auth/register] error', err.response?.data || err.message)
    return rejectWithValue(err.response?.data?.message || err.message || 'Error')
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
    if (data?.token) setAuthToken(data.token)
    if (data?.token) localStorage.setItem('token', data.token)
    if (data?.user)  localStorage.setItem('user', JSON.stringify(data.user))
    return data
  }catch(err){
    // eslint-disable-next-line no-console
    console.error('[auth/login] error', err.response?.data || err.message)
    return rejectWithValue(err.response?.data?.message || err.message || 'Error')
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
  if (token) setAuthToken(token)
  try{
    const user = await authService.me() // devuelve User
    return { token, user }
  }catch(err){
    // eslint-disable-next-line no-console
    console.warn('[auth/loadUser] sin sesión o token inválido', err.response?.status || err.message)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuthToken(null)
    throw new Error('No hay sesión')
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
    },
    // Actualiza campos del perfil (mock) y persiste en localStorage
    updateProfile(state, action){
      if (!state.user) return
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem('user', JSON.stringify(state.user))
    },
  },
  extraReducers: (builder)=>{
    const fulfilled = (state, action)=>{
      state.status = 'succeeded'
      state.error  = null
      state.token  = action.payload?.token ?? state.token
      state.user   = action.payload?.user  ?? state.user
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
          state.user  = action.payload.user  ?? state.user
        }
      })
      .addCase(loadUser.rejected, rejected)
  }
})

export const { logout, updateProfile } = authSlice.actions
export default authSlice.reducer
