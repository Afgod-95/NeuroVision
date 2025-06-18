import express, { Request, Response } from 'express';
import { 
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
   verifyEmailOtp,
   resetPasswordRequest,
   deleteUserAccount,
   updateUserProfile,
   resetUserPassword,
   resendOtp

 } from '../controller/auth/users';
 import { RequestHandler } from 'express';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';

const authRouter = express.Router();

//api endpoints for user auth
authRouter.post('/api/auth/register', registerUser as RequestHandler);
authRouter.post('/api/auth/verify-email', verifyEmailOtp as RequestHandler);
authRouter.post('/api/auth/resend-verification-otp', resendOtp as RequestHandler);
authRouter.post('/api/auth/login', loginUser as RequestHandler);
authRouter.post('/api/auth/logout', logoutUser);
authRouter.post('/api/auth/reset-password-request', resetPasswordRequest as RequestHandler);
authRouter.post('/api/auth/reset-password/:id', resetUserPassword as RequestHandler);
authRouter.put('/api/auth/update-profile/:id', updateUserProfile as RequestHandler);
authRouter.get('/api/auth/get-profile/:id', getUserProfile as RequestHandler);
authRouter.delete('/api/auth/delete-account/:id', deleteUserAccount);


//TRANSCRIBE AUDIO 
authRouter.post('/api/user/transcribe-audio', async (req: Request, res: Response) => {
    try {
        await transcribeAudio(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default authRouter;  