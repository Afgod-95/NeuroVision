// middleware/validation.ts
import { Request, Response, NextFunction } from 'express';

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        res.status(500).json({
            error: 'Gemini API key is not configured'
        });
        return;
    }
    
    next();
};

export const rateLimiter = (windowMs: number = 60000, max: number = 100) => {
    const requests = new Map();
    
    return (req: Request, res: Response, next: NextFunction): void => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        
        if (!requests.has(clientId)) {
            requests.set(clientId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        
        const clientData = requests.get(clientId);
        
        if (now > clientData.resetTime) {
            requests.set(clientId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        
        if (clientData.count >= max) {
            res.status(429).json({
                error: 'Too many requests, please try again later'
            });
            return;
        }
        
        clientData.count++;
        next();
    };
};