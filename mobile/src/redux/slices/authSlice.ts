import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import { refreshTokenApi } from '@/src/services/tokenRefreshService';
import authApi from '@/src/services/authApiClient';
import api from '@/src/services/axiosClient';

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
  errorCode: string | null; // Add this to track error codes
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
  errorCode: null,
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
      return rejectWithValue(error.message);
    }
  }
);

// login user - FIXED VERSION WITH PROPER ERROR HANDLING
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Starting login process...');
      const response = await authApi.post('/api/auth/login', { email, password });
      console.log('Login API response received:', response.status);
      

      const { user: userData, tokens } = response.data.data;

      if (!userData || !tokens) {
        throw new Error('Invalid response format from server');
      }

      return {
        user: userData,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      console.log('Login error caught:', error);
      
      // Default error
      let errorMessage = 'An error occurred during login. Please try again.';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error.response?.data) {
        //Your backend sends { success: false, error: { code, message, details } }
        const errorData = error.response.data;
        
        if (errorData.error) {
          errorMessage = errorData.error.message || errorMessage;
          errorCode = errorData.error.code || errorCode;
        } else if (errorData.message) {
          // Fallback if structure is different
          errorMessage = errorData.message;
        }
        
        console.log('Extracted error:', { code: errorCode, message: errorMessage });
          
      } else if (error.request) {
        // Request was made but no response received (network error)
        console.log('Network error - no response received');
        errorMessage = 'Network error. Please check your internet connection.';
        errorCode = 'NETWORK_ERROR';
        
      } else {
        // Error in request setup
        console.log('Request setup error:', error.message);
        errorMessage = error.message || 'Failed to process login request';
        errorCode = 'REQUEST_ERROR';
      }
      
      console.log('Final error:', { code: errorCode, message: errorMessage });
      
      return rejectWithValue({ 
        message: errorMessage,
        code: errorCode 
      });
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
          const response = await api.post('/api/auth/logout', { refreshToken }, {
            headers: {
              'Authorization': `Bearer ${state.auth.accessToken}`,
            },
          });
          console.log('Logout API response:', response.data);
        } catch (error: any) {
          console.log('Logout API failed, but continuing with local logout');
          
          // Log the error details for debugging
          if (error.response?.data?.error) {
            console.log('Logout error:', error.response.data.error);
          }
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


export const logout_user_on_all_devices = createAsyncThunk(
  'auth/logoutUserOnAllDevices',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;

      console.log('Starting logout process...');

      if (refreshToken) {
        try {
          const response = await api.post('/api/auth/logout-all', {
            headers: {
              'Authorization': `Bearer ${state.auth.accessToken}`,
            },
          });
          console.log('Logout API response:', response.data);
        } catch (error: any) {
          console.log('Logout API failed, but continuing with local logout');
          
          // Log the error details for debugging
          if (error.response?.data?.error) {
            console.log('Logout error:', error.response.data.error);
          }
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
      state.errorCode = null;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.loading = false;
      state.isRegistrationComplete = false;
      state.error = null;
      state.errorCode = null;
    },
    resetState(state) {
      return initialState;
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
      state.errorCode = null;
    },
    
    clearError(state) {
      state.error = null;
      state.errorCode = null;
    },

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
        state.errorCode = null;
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
        state.errorCode = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.log('Login rejected - error:', action.payload);
        state.loading = false;
        state.isAuthenticated = false;
        state.isRegistrationComplete = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        
        // ✅ FIXED: Handle the new error structure
        const payload = action.payload as { message: string; code: string } | string;
        
        if (typeof payload === 'object') {
          state.error = payload.message;
          state.errorCode = payload.code;
        } else {
          state.error = payload || 'Login failed';
          state.errorCode = 'UNKNOWN_ERROR';
        }
      })
      
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        return initialState;
      })
      .addCase(logoutUser.rejected, (state) => {
        return initialState;
      })

      //logout_out_all on all devices,
      .addCase(logout_user_on_all_devices.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(logout_user_on_all_devices.fulfilled, (state) => {
        return initialState;
      })
      .addCase(logout_user_on_all_devices.rejected, (state => {
        return initialState
      }))
      
      // Refresh token cases
      .addCase(refreshAccessToken.pending, (state) => {
        state.error = null;
        state.errorCode = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        state.error = null;
        state.errorCode = null;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        console.log('Token refresh failed, logging out user');
        state.isAuthenticated = false; 
        state.isRegistrationComplete = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.loading = false;
        state.error = action.payload as string || 'Session expired';
        state.errorCode = 'TOKEN_REFRESH_FAILED';
      });
  },
});

export const { 
  login, logout, resetState, 
  updateTokens, clearError, setUseBiometrics, 
  completeRegistration
} = authSlice.actions;

export default authSlice.reducer;