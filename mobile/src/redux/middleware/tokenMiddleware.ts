import { createListenerMiddleware } from '@reduxjs/toolkit';
import { updateTokens, resetState } from '../slices/authSlice';
import { refreshTokens } from '../actions/tokenAction';
import axios from 'axios';
import Constants from 'expo-constants';

export const tokenMiddleware = createListenerMiddleware();

// Listen for token refresh requests
tokenMiddleware.startListening({
  actionCreator: refreshTokens,
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

      listenerApi.dispatch(updateTokens({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: data.user
      }));

      // Resolve the promise if provided
      action.payload.resolve?.(data.tokens.accessToken);

    } catch (error) {
      console.error('Middleware: Token refresh failed:', error);
      listenerApi.dispatch(resetState());
      action.payload.reject?.(error);
    }
  },
});