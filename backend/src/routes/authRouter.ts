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
authRouter.post('/register', registerUser as RequestHandler);
authRouter.post('/verify-email', verifyEmailOtp as RequestHandler);
authRouter.post('/resend-verification-otp', resendOtp as RequestHandler);
authRouter.post('/resend-password-reset-otp', resendOtp as RequestHandler);
authRouter.post('/login', loginUser as RequestHandler);
authRouter.post('/logout', logoutUser);
authRouter.post('/reset-password-request', resetPasswordRequest as RequestHandler);
authRouter.post('/reset-password/:id', resetUserPassword as RequestHandler);
authRouter.put('/update-profile/:id', updateUserProfile as RequestHandler);
authRouter.get('/get-profile/:id', getUserProfile as RequestHandler);
authRouter.delete('/delete-account/:id', deleteUserAccount);


//TRANSCRIBE AUDIO 
authRouter.post('/api/user/transcribe-audio', async (req: Request, res: Response) => {
    try {
        await transcribeAudio(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


export default authRouter;  