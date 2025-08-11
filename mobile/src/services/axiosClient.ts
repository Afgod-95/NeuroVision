import axios from "axios";
import Constants from "expo-constants";
import type { Store } from "@reduxjs/toolkit";
import { refreshTokens } from "../redux/actions/tokenAction";

let reduxStore: Store | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

export const injectStore = (store: Store) => {
  reduxStore = store;
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.baseBackendUrl,
});

api.interceptors.request.use(
  (config) => {
    if (!reduxStore) return config;
    const state = reduxStore.getState();
    const token = state?.user?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!reduxStore || !error.response) {
      return Promise.reject(error);
    }

    const isTokenExpired = 
      error.response.status === 401 || 
      error.response?.data?.error === "TOKEN_EXPIRED" ||
      error.response?.data?.message === "Token expired";

    if (isTokenExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('Axios: Dispatching token refresh...');
        
        const newToken = await new Promise<string>((resolve, reject) => {
          reduxStore!.dispatch(refreshTokens({ resolve, reject }));
        });

        console.log('Axios: Token refresh completed');

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error('Axios: Token refresh failed');
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;