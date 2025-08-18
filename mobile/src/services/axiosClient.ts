// src/services/axiosClient.ts
import axios from "axios";
import { refreshTokenApi } from "./tokenRefreshService";
import Constants from "expo-constants";

// Create a separate axios instance for auth requests (login, register, etc.)
// This instance doesn't have token refresh interceptors
const baseUrl = Constants.expoConfig?.extra?.baseBackendUrl;
console.log("Axios client url:", baseUrl);

let injectedStore: any;
let onTokenRefreshCallback: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;
let onLogoutCallback: (() => void) | null = null;

export const injectStore = (store: any) => {
  injectedStore = store;
};

export const setTokenRefreshCallback = (callback: (tokens: { accessToken: string; refreshToken: string }) => void) => {
  onTokenRefreshCallback = callback;
};

export const setLogoutCallback = (callback: () => void) => {
  onLogoutCallback = callback;
};

const api = axios.create({
  baseURL: baseUrl,
});

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Function to add requests to queue while refreshing
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Function to process queued requests after refresh
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Log the full URL being called
    const fullURL = `${config.baseURL}${config.url}`;
    console.log(`Making ${config.method?.toUpperCase()} request to:`, fullURL);
    
    if (injectedStore) {
      const state = injectedStore.getState().auth;
      const token = state.accessToken;
      
      console.log("Access token being sent:", token ? `${token.substring(0, 20)}...` : 'null');
      console.log("User authenticated:", state.isAuthenticated);
      
      // Only add token if user is authenticated and token exists
      if (state.isAuthenticated && token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (!state.isAuthenticated) {
        console.log("User not authenticated - not setting Authorization header");
      } else {
        console.warn("User authenticated but no access token found");
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and we haven't already tried to refresh
    // Also check if this is a public route that shouldn't trigger refresh
    const isPublicRoute = originalRequest.url?.includes('/auth/login') || 
                         originalRequest.url?.includes('/auth/register') ||
                         originalRequest.url?.includes('/auth/refresh-token');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicRoute) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      if (injectedStore) {
        const state = injectedStore.getState().auth;
        
        // Only attempt refresh if user is authenticated and has a refresh token
        if (state.isAuthenticated && state.refreshToken) {
          isRefreshing = true;

          try {
            console.log('Attempting to refresh token...');
            
            // Use the separate refresh API
            const tokens = await refreshTokenApi(state.refreshToken);
            
            console.log('Token refresh successful');
            
            // Update tokens in store via callback
            if (onTokenRefreshCallback) {
              onTokenRefreshCallback(tokens);
            }
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            
            // Process queued requests
            onTokenRefreshed(tokens.accessToken);
            
            isRefreshing = false;
            
            // Retry the original request
            return api(originalRequest);
            
          } catch (refreshError) {
            isRefreshing = false;
            console.log('Token refresh failed:', refreshError);
            
            // Call logout callback
            if (onLogoutCallback) {
              onLogoutCallback();
            }
            
            return Promise.reject(error);
          }
        } else {
          console.log('User not authenticated or no refresh token available - not attempting refresh');
          
          // If user is not authenticated, don't try to refresh
          if (!state.isAuthenticated) {
            console.log('User not authenticated, rejecting request');
            return Promise.reject(error);
          }
          
          // Call logout callback if authenticated but no refresh token
          if (onLogoutCallback) {
            onLogoutCallback();
          }
          
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;