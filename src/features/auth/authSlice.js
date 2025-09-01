// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
// Si luego conectás backend real, podrás usar axios:
// import axios from 'axios'
import * as mock from '../../services/mockAuth.js'

const isMock =
  String(import.meta.env.VITE_MOCK_AUTH ?? '1').toLowerCase() !== '0' &&
  String(import.meta.env.VITE_MOCK_AUTH ?? '1').toLowerCase() !== 'false'
// const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const initialState = {
  token : localStorage.getItem('token') || null,
  user  : JSON.parse(localStorage.getItem('user') || 'null'),
  status: 'idle',
  error : null,
}

/* ============ THUNKS ============ */
export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue })=>{
  try{
    if (isMock) return await mock.register(payload)
    // const { data } = await axios.post(`${API}/api/auth/register/`, payload);
    // return data;
    throw new Error('Backend no configurado')
  }catch(err){ return rejectWithValue(err.message || 'Error') }
})

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue })=>{
  try{
    if (isMock) return await mock.login(payload)
    // const { data } = await axios.post(`${API}/api/auth/login/`, payload);
    // return data;
    throw new Error('Backend no configurado')
  }catch(err){ return rejectWithValue(err.message || 'Error') }
})

export const loginDemo = createAsyncThunk('auth/loginDemo', async (role, { rejectWithValue })=>{
  try{
    return await mock.loginDemo(role)
  }catch(err){ return rejectWithValue(err.message || 'Error') }
})

export const loadUser = createAsyncThunk('auth/loadUser', async (_,_helpers)=>{
  if (isMock) return await mock.getCurrent()
  // const { data } = await axios.get(`${API}/api/auth/user/`);
  // return data;
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
      // (mock ya guarda en localStorage; igual el store queda sincronizado)
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
