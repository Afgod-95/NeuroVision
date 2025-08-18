import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import { refreshTokenApi } from '@/src/services/tokenRefreshService';
import authApi from '@/src/services/authApiClient';

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_email_verified: boolean;
  password?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  isRegistrationComplete: boolean,
  error: string | null;
  useBiometrics: boolean,
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  isRegistrationComplete: false,
  error: null,
  useBiometrics: false
};



// Refresh token thunk - now uses the separate service
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshAccessToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { refreshToken } = state.auth;

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      console.log('Starting token refresh...');
      const tokens = await refreshTokenApi(refreshToken);
      console.log('Token refresh completed successfully');
      
      return tokens;
    } catch (error: any) {
      console.log('Token refresh failed:', error.message);
      return rejectWithValue( error.message);
    }
  }
);

// login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Starting login process...');
      const response = await authApi.post('/api/auth/login', { email, password });
      console.log('Login API response received:', response.status);
      
      const { user: userData, token } = response.data;

      if (!userData || !token) {
        throw new Error('Invalid response format from server');
      }

      return {
        user: userData,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      };
    } catch (error: any) {
      console.log('Login error:', error);
      
      let errorMessage = 'An error occurred whilst signing in. Please check your credentials and try again.';
      
      if (error.response) {
        // Server responded with error status
        console.log('Server error response:', error.response.data);
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request was made but no response received
        console.log('Network error - no response received');
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        // Something else happened
        console.log('Request setup error:', error.message);
        errorMessage = error.message || errorMessage;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;

      console.log('Starting logout process...');

      if (refreshToken) {
        try {
          const response = await authApi.post('/api/auth/logout', { refreshToken });
          console.log('Logout API response:', response.data);
        } catch (error) {
          console.log('Logout API failed, but continuing with local logout:', error);
        }
      }

      console.log('Logout completed');
      return true;
    } catch (error: any) {
      console.error('Logout failed:', error);
      return rejectWithValue(error.message);
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
      state.loading = false;
      state.isRegistrationComplete = true
      state.error = null;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.loading = false;
      state.isRegistrationComplete = false;
      state.error = null;
    },
    resetState(state) {
      return initialState; // Reset to initial state
    },

     completeRegistration: (state) => {
      state.isRegistrationComplete = true;
    },

    updateTokens(state, action) {
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      if (action.payload.user) {
        state.user = action.payload.user;
      }
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },

    //allow users to use biometrics after successful login 
    setUseBiometrics(state, action) {
      state.useBiometrics = action.payload;
    },

  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        console.log('Login pending - setting loading to true');
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log('Login fulfilled - setting loading to false');
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.isRegistrationComplete = true;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.log('Login rejected - setting loading to false');
        state.loading = false;
        state.isAuthenticated = false;
        state.isRegistrationComplete = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = action.payload as string || 'Login failed';
      })
      
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        return initialState; // Reset to initial state
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if logout API fails, clear the local state
        return initialState;
      })
      
      // Refresh token cases
      .addCase(refreshAccessToken.pending, (state) => {
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        state.error = null;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        console.log('Token refresh failed, logging out user');
        // Token refresh failed, user needs to login again
        state.isAuthenticated = false; 
        state.isRegistrationComplete = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.loading = false;
        state.error = action.payload as string || 'Session expired';
      });
  },
});

export const { 
  login, logout, resetState, 
  updateTokens, clearError, setUseBiometrics, 
  completeRegistration

 } = authSlice.actions;
export default authSlice.reducer;