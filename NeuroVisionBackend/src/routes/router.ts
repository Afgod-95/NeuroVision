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

const router = express.Router();

//api endpoints for user auth
// Ensure registerUser is a function: (req: Request, res: Response) => Promise<Response>
// If not, update the import or export in ../controller/auth/users accordingly.
router.post('/api/auth/register', registerUser as RequestHandler);
router.post('/api/auth/verify-email', verifyEmailOtp as RequestHandler);
router.post('/api/auth/resend-otp', resendOtp as RequestHandler);
router.post('/api/auth/login', loginUser as RequestHandler);
router.post('/api/auth/logout', logoutUser);
router.post('/api/auth/reset-password-request', resetPasswordRequest as RequestHandler);
router.post('/api/auth/reset-password/', resetUserPassword as RequestHandler);
router.put('/api/auth/update-profile/:id', updateUserProfile as RequestHandler);
router.get('/api/auth/get-profile/:id', getUserProfile as RequestHandler);
router.delete('/api/auth/delete-account/:id', deleteUserAccount);


export default router;  