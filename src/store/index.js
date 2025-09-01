import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice.js'
import artworksReducer from '../features/artworks/artworksSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    artworks: artworksReducer,
  }
})
