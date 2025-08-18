
import axios from "axios";
import Constants from "expo-constants";

// Create a separate axios instance for auth requests (login, register, etc.)
// This instance doesn't have token refresh interceptors
const baseUrl = Constants.expoConfig?.extra?.baseBackendUrl;
console.log("Auth API baseURL:", baseUrl);
const authApi = axios.create({
    baseURL: baseUrl,
});

// Simple request interceptor for logging
authApi.interceptors.request.use(
  (config) => {
    console.log("Auth API request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Simple response interceptor for logging
authApi.interceptors.response.use(
  (response) => {
    console.log("Auth API response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log("Auth API error:", error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export default authApi;