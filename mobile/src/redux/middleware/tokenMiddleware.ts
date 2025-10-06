import { createListenerMiddleware } from '@reduxjs/toolkit';
import { updateTokens, resetState } from '../slices/authSlice';
import { refreshAccessToken } from '../slices/authSlice';
import axios from 'axios';
import Constants from 'expo-constants';

export const tokenMiddleware = createListenerMiddleware();

// Listen for token refresh requests
tokenMiddleware.startListening({
  actionCreator: refreshAccessToken,
  effect: async (action, listenerApi) => {
    try {
      const state = listenerApi.getState() as any;
      const refreshToken = state.user.refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('Middleware: Attempting to refresh token...');

      const refreshApi = axios.create({
        baseURL: Constants.expoConfig?.extra?.baseBackendUrl,
      });

      const { data } = await refreshApi.post('/api/auth/refresh-token', {
        refreshToken
      });

      console.log('Middleware: Token refresh successful');
      const { accessToken, refreshToken: newRefreshToken } = data.tokens;
      listenerApi.dispatch(updateTokens({
        accessToken,
        refreshToken: newRefreshToken,
        user: data.user
      }));

     

      // Resolve the promise if provided
      action.payload.resolve?.(accessToken);
      console.log(`Resolving token: ${accessToken}`);
      console.log(`Resolving new refresh token: ${newRefreshToken}`)

    } catch (error) {
      console.error('Middleware: Token refresh failed:', error);
      listenerApi.dispatch(resetState());
      action.payload.reject?.(error);
    }
  },
});