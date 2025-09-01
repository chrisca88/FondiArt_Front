import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../utils/api'

export const fetchArtworks = createAsyncThunk('artworks/fetch', async (_, thunkAPI)=>{
  try{
    const { data } = await api.get('/api/artworks/')
    return data
  }catch(err){
    return thunkAPI.rejectWithValue(err.response?.data || 'FETCH_FAIL')
  }
})

export const createArtwork = createAsyncThunk('artworks/create', async (payload, thunkAPI)=>{
  try{
    const { data } = await api.post('/api/artworks/', payload)
    return data
  }catch(err){
    return thunkAPI.rejectWithValue(err.response?.data || 'CREATE_FAIL')
  }
})

const slice = createSlice({
  name: 'artworks',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder)=>{
    builder
      .addCase(fetchArtworks.fulfilled, (state, action)=>{
        state.items = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchArtworks.pending, (state)=>{ state.status='loading' })
      .addCase(fetchArtworks.rejected, (state, action)=>{
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(createArtwork.fulfilled, (state, action)=>{
        state.items.unshift(action.payload)
      })
  }
})

export default slice.reducer
