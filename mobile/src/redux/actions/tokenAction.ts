import { createAction } from '@reduxjs/toolkit';

export interface RefreshTokenPayload {
  resolve?: (token: string) => void;
  reject?: (error: any) => void;
}

export const refreshTokens = createAction<RefreshTokenPayload>('auth/refreshTokens');
