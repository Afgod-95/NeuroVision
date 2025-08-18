import axios from 'axios';
import Constants from "expo-constants";

const refreshApi = axios.create({
  baseURL: Constants.expoConfig?.extra?.baseBackendUrl,
});

export const refreshTokenApi = async (refreshToken: string) => {
  try {
    const response = await refreshApi.post('/api/auth/refresh-token', { 
      refreshToken 
    });
    
    console.log(`Refreshing token: ${response}`)
    const { tokens } = response.data;
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    console.log('Token refresh API failed:', error);
    throw error;
  }
};