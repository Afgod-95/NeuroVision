import axios from 'axios';
import { store } from '../redux/store';
import { login,  logoutUser } from '../redux/slices/authSlice';
import Constants from 'expo-constants';

const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.baseBackendUrl
});

api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state?.user?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.data?.error === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = store.getState().user.refreshToken;
        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post(`${Constants.expoConfig?.extra?.baseBackendUrl}/api/auth/refresh`, {
          refreshToken,
        });

        // Dispatch action to update tokens in Redux store
        store.dispatch(
          login({
            user: data.user, 
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
          })
        );

        // Update Authorization header and retry original request
        originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;

        return api(originalRequest);
      } catch (err) {
        // Dispatch logout on refresh failure
        store.dispatch(logoutUser());
      }
    }

    return Promise.reject(error);
  }
);

export default api;
