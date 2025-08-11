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
  'auth/logoutUser', 
  async (_, { dispatch, getState }) => {
    try {
      const state = getState() as { user: UserState };
      const refreshToken = state.user.refreshToken;

      if (refreshToken) {
        const response = await api.post('/api/auth/logout', { refreshToken });
        console.log(response.data);
      }
      
      Alert.alert("You have successfully logged out");
      dispatch(resetState());
    } catch (error) {
      console.error('Logout failed:', error);
      // Still reset state even if logout API fails
      dispatch(resetState());
    }
  }
);

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
      state.refreshToken = null;
    },
    resetState(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    },
    // Add this new action for updating tokens
    updateTokens(state, action) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      if (action.payload.user) {
        state.user = action.payload.user;
      }
    }
  },
});

export const { login, logout, resetState, updateTokens } = authSlice.actions;
export default authSlice.reducer;