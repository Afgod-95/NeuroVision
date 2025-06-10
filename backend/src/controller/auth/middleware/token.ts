import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Types
interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// MODERN JWT IMPLEMENTATION - FIXES COMMON ISSUES

// Generate Access Token with better error handling
export const generateAccessToken = ({ userId }: { userId: number | string }): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  
  // More explicit checks
  if (!secret || secret.trim() === '') {
    throw new Error("ACCESS_TOKEN_SECRET is not defined or empty");
  }
  
  try {
    return jwt.sign(
      { userId }, // payload
      secret,     // secret
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
        issuer: process.env.JWT_ISSUER || "your-mobile-app",
        audience: process.env.JWT_AUDIENCE || "mobile-users",
        algorithm: 'HS256' // Explicitly set algorithm
      }
    );
  } catch (error) {
    console.error('Error generating access token:', error);
    throw new Error(`Failed to generate access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Generate Refresh Token with better error handling
export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!secret || secret.trim() === '') {
    throw new Error("REFRESH_TOKEN_SECRET is not defined or empty");
  }
  
  try {
    return jwt.sign(
      { userId },
      secret,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "365d",
        issuer: process.env.JWT_ISSUER || "your-mobile-app",
        audience: process.env.JWT_AUDIENCE || "mobile-users",
        algorithm: 'HS256'
      }
    );
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Alternative implementation using promises (if you prefer async/await)
export const generateAccessTokenAsync = async (userId: string): Promise<string> => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  
  if (!secret || secret.trim() === '') {
    throw new Error("ACCESS_TOKEN_SECRET is not defined or empty");
  }
  
  return new Promise((resolve, reject) => {
    jwt.sign(
      { userId },
      secret,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
        algorithm: 'HS256'
      },
      (error, token) => {
        if (error) {
          console.error('Async token generation error:', error);
          reject(new Error(`Failed to generate token: ${error.message}`));
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('Token generation returned undefined'));
        }
      }
    );
  });
};

// Simple token generation (minimal version if above fails)
export const generateSimpleToken = (userId: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is required");
  }
  
  // Most basic version - should work with any version
  return jwt.sign({ userId }, secret);
};

// Generate both tokens with comprehensive error handling
export const generateTokenPair = (userId: string): TokenPair => {
  try {
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
    };
  } catch (error) {
    console.error('Error generating token pair:', error);
    throw error; // Re-throw to handle in calling code
  }
};

// TOKEN VERIFICATION with better error handling
export const verifyAccessToken = (token: string): JwtPayload => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }
  
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    // More specific error handling
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token format");
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error("Token not active yet");
    } else {
      console.error('Token verification error:', error);
      throw new Error("Token verification failed");
    }
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }
  
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    } else {
      throw new Error("Refresh token verification failed");
    }
  }
};

// MIDDLEWARE (same as before, but with better error logging)
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'Access denied',
      message: 'No token provided. Please include a valid token in the Authorization header.'
    });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    const message = error instanceof Error ? error.message : 'Authentication failed';
    
    if (message.includes('expired')) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please refresh your token or log in again.'
      });
    } else {
      res.status(403).json({
        error: 'Invalid token',
        message
      });
    }
  }
};

// DEBUG FUNCTION - Use this to test your environment variables
export const debugJWT = (): void => {
  console.log('=== JWT Debug Info ===');
  console.log('ACCESS_TOKEN_SECRET exists:', !!process.env.ACCESS_TOKEN_SECRET);
  console.log('ACCESS_TOKEN_SECRET length:', process.env.ACCESS_TOKEN_SECRET?.length || 0);
  console.log('REFRESH_TOKEN_SECRET exists:', !!process.env.REFRESH_TOKEN_SECRET);
  console.log('ACCESS_TOKEN_EXPIRES_IN:', process.env.ACCESS_TOKEN_EXPIRES_IN || 'not set');
  console.log('REFRESH_TOKEN_EXPIRES_IN:', process.env.REFRESH_TOKEN_EXPIRES_IN || 'not set');
  
  // Test basic JWT functionality
  try {
    const testToken = jwt.sign({ test: 'data' }, 'test-secret');
    console.log('Basic JWT signing works:', !!testToken);
  } catch (error) {
    console.log('Basic JWT signing failed:', error);
  }
  console.log('===================');
};

// Utility function to get user ID
export const getUserId = (req: AuthenticatedRequest): string => {
  if (!req.user?.userId) {
    throw new Error('User not authenticated');
  }
  return req.user.userId;
};

/*
COMMON ISSUES & SOLUTIONS:

1. SECRET NOT FOUND:
   - Make sure your .env file is loaded
   - Check: console.log(process.env.ACCESS_TOKEN_SECRET)
   - Use dotenv: require('dotenv').config()

2. SECRET TOO SHORT:
   - Use at least 32 characters for your secret
   - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

3. ALGORITHM ISSUES:
   - Explicitly set algorithm: 'HS256'
   - Some versions require this

4. PACKAGE VERSION:
   - Check: npm list jsonwebtoken
   - Try: npm install jsonwebtoken@latest

5. TYPESCRIPT ISSUES:
   - Install types: npm install @types/jsonwebtoken
   - Use default import: import jwt from 'jsonwebtoken'

TESTING YOUR SETUP:
1. Run debugJWT() to check your environment
2. Try generateSimpleToken() first
3. If that works, use the full generateAccessToken()
*/