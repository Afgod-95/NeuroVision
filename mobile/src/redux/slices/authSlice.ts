import { createSlice } from '@reduxjs/toolkit';

interface User {
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
}


const initialState: UserState = {
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action) {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
    },
    resetState (state) {
      state.isAuthenticated = false;
      state.user = null;
    }
  },
});

export const { login, logout, resetState } = authSlice.actions;
export default authSlice.reducer;
