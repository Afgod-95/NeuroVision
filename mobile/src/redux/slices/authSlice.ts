import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '@/src/services/axiosClient';
import { Alert } from 'react-native';

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_email_verified: boolean;
  password?: string;
}

interface UserState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}


const initialState: UserState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null
};

export const logoutUser = createAsyncThunk(
  'auth/logoutUser', async (_, { dispatch }) => {
    try {
      await api.post('/logout');
      Alert.alert("You have sucessfully logged out");
      dispatch(resetState());
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action) {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null
    },
    resetState (state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null
    }
  },
});

export const { login, logout, resetState } = authSlice.actions;
export default authSlice.reducer;
