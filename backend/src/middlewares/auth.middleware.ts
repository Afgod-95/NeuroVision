import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from "../lib/supabase";

// Extend Express Request interface
declare global {
    namespace Express {
        interface User {
            id: string; 
            userId: string; 
            email?: string;
            username?: string; 
            sessionId?: string; 
        }
        interface Request {
            user?: User;
        }
    }
}

interface JwtPayload {
    userId: string; 
    sessionId?: string; 
    iat?: number;
    exp?: number;
}

// Store only refresh tokens, not access tokens
export const verifyAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'MISSING_TOKEN',
            message: 'Access token not found' 
        });
    }

    try {
        // Verify JWT access token (stateless - no database lookup)
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
        
        // For high-performance apps, skip this and rely on short token expiry
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username, is_email_verified')
            .eq('id', decoded.userId)
            .single();

        if (error || !user || !user.is_email_verified) {
            return res.status(403).json({ 
                error: 'USER_INACTIVE',
                message: 'User account is not verified or not found' 
            });
        }

        req.user = { 
            id: decoded.userId, 
            userId: decoded.userId,
            email: user.email,
            username: user.username,
            sessionId: decoded.sessionId 
        };
        
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ 
                error: 'TOKEN_EXPIRED',
                message: 'Access token has expired' 
            });
        }

        console.log(error)
        
        return res.status(403).json({ 
            error: 'INVALID_TOKEN',
            message: 'Invalid access token' 
        });
    }
};

//Store refresh tokens in database
export const verifyRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ 
            error: 'MISSING_TOKEN',
            message: 'Refresh token not found' 
        });
    }

    try {
        // Hash the refresh token for database lookup
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        // Check if refresh token exists and is valid in database
        const { data: storedToken, error } = await supabase
            .from('refresh_tokens')
            .select(`
                id,
                user_id,
                expires_at,
                revoked,
                users!inner(id, email, username, is_email_verified)
            `)
            .eq('token_hash', tokenHash)
            .eq('revoked', false)
            .single();

        if (error || !storedToken) {
            return res.status(403).json({ 
                error: 'INVALID_TOKEN',
                message: 'Invalid refresh token' 
            });
        }
        

        // Check if token is expired
        if (new Date(storedToken.expires_at) < new Date()) {
            // Clean up expired token
            await supabase
                .from('refresh_tokens')
                .delete()
                .eq('id', storedToken.id);

            return res.status(401).json({ 
                error: 'TOKEN_EXPIRED',
                message: 'Refresh token has expired' 
            });
        }

        // Check if user email is verified
        const user = Array.isArray(storedToken.users) ? storedToken.users[0] : storedToken.users;
        if (!user || !user.is_email_verified) {
            return res.status(403).json({ 
                error: 'EMAIL_NOT_VERIFIED',
                message: 'Email address is not verified' 
            });
        }

        req.user = { 
            id: user.id, 
            userId: user.id,
            email: user.email,
            username: user.username
        };
        
        next();
    } catch (error) {
        console.log(error)
        return res.status(403).json({ 
            error: 'TOKEN_ERROR',
            message: 'Error validating refresh token' 
        });
    }
};

// Token generation and storage functions
export const generateTokenPair = async (userId: string, sessionId?: string) => {
    const accessToken = jwt.sign(
        { 
            userId, 
            sessionId: sessionId || crypto.randomUUID() 
        },
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: '15m' }
    );

    // Generate long-lived refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); 

    const { error } = await supabase
        .from('refresh_tokens')
        .insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        });

    if (error) {
        throw new Error('Failed to store refresh token');
    }
    console.log(`Access token: ${accessToken}`)
    console.log(`Refresh token: ${refreshToken}`)
    return { accessToken, refreshToken };
};

// Revoke refresh token (logout)
export const revokeRefreshToken = async (refreshToken: string) => {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const { error } = await supabase
        .from('refresh_tokens')
        .update({ revoked: true, revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);

    return !error;
};

// Revoke all user tokens (logout from all devices)
export const revokeAllUserTokens = async (userId: number) => {
    const { error } = await supabase
        .from('refresh_tokens')
        .update({ revoked: true, revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('revoked', false);

    return !error;
};

// Clean up expired tokens (run periodically)
export const cleanupExpiredTokens = async () => {
    const { error } = await supabase
        .from('refresh_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

    return !error;
};