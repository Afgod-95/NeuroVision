import express, { NextFunction, Request, Response } from 'express';
import * as authController from '../controller/auth.controller';
 import { RequestHandler } from 'express';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';
import { verifyAccessToken, verifyRefreshToken  } from '../middlewares/auth.middleware';

const authRouter = express.Router();

//api endpoints for user auth
authRouter.post('/register', authController.registerUser as RequestHandler);
authRouter.post('/verify-email', authController.verifyEmailOtp as RequestHandler);
authRouter.post('/resend-verification-otp', authController.resendOtp as RequestHandler);
authRouter.post('/resend-password-reset-otp', authController.resendOtp as RequestHandler);
authRouter.post('/login', authController.loginUser as RequestHandler);
authRouter.post('/logout', verifyAccessToken as RequestHandler, authController.logout as RequestHandler);
authRouter.post('/logout-all', verifyAccessToken as RequestHandler, authController.logoutAll as RequestHandler);
authRouter.post('/reset-password-request', authController.resetPasswordRequest as RequestHandler);
authRouter.post('/refresh-token', verifyRefreshToken as RequestHandler, authController.refreshToken as RequestHandler)
authRouter.put('/update-password', verifyAccessToken as RequestHandler, authController.updatePassword as RequestHandler);


authRouter.get('/profile', verifyAccessToken as RequestHandler, authController.getProfile as RequestHandler)
authRouter.delete('/delete-account/:id', verifyAccessToken as RequestHandler, authController.deleteUserAccount as RequestHandler);


//TRANSCRIBE AUDIO 
authRouter.post('/api/user/transcribe-audio', async (req: Request, res: Response) => {
    try {
        await transcribeAudio(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default authRouter;  