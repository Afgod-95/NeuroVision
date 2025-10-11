import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import { sendOtp } from '../services/sendOtp';
import {
  checkUserExists,
  validateRegisterFields,
  createUser
} from '../helpers/userHelpers';
import { comparePassword, hashPassword } from '../utils/encryptedPassword';
import { getDevicesLocation_info, isDeviceNew, saveDevice, sendNewDeviceEmail } from '../services/devicesLoginDetector';
import { updateDeviceLastAccessed } from '../helpers/lastAccessedDevice';
import { generateTokenPair, revokeAllUserTokens, revokeRefreshToken } from '../middlewares/auth.middleware';
import bcrypt from 'bcrypt';
import { deleteAuthUser } from '../lib/supabase';

// Standardized error response format
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ApiSuccess<T = any> {
  success: true;
  message: string;
  data?: T;
}

// Helper function to send consistent error responses
const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  });
};

// Helper function to send consistent success responses
const sendSuccess = <T = any>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    ...(data && { data })
  });
};

//register user endpoint
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validate fields
    if (!username || !email || !password) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Username, email, and password are required');
      return;
    }

    if (password.length < 8) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 8 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid email format');
      return;
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      sendError(res, 409, 'USER_EXISTS', 'User with this email already exists');
      return;
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password: hashedPassword,
        is_email_verified: false
      }])
      .select()
      .single();

    if (createError || !newUser) {
      console.error('User creation error:', createError);
      sendError(res, 500, 'USER_CREATION_FAILED', 'Failed to create user account');
      return;
    }

    // Send OTP
    const otpResult = await sendOtp(newUser);
    
    if (otpResult.error) {
      console.error('OTP sending error:', otpResult.error);
      // User was created but OTP failed - still return success but warn about OTP
      sendSuccess(res, 201, 'User created but failed to send verification email. Please request a new OTP.', {
        userId: newUser.id,
        email: newUser.email
      });
      return;
    }

    const { data: otp_verifications } = await supabase
      .from('otps')
      .select('expires_at')
      .eq('user_id', newUser.id)
      .single();

    sendSuccess(res, 201, 'User created successfully. A 6-digit OTP has been sent to your email.', {
      userId: newUser.id,
      email: newUser.email,
      otpExpires: otp_verifications?.expires_at
    });

  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred during registration');
  }
};

//resend otp 
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Email is required');
      return;
    }

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'No account found with this email address');
      return;
    }

    if (user.is_email_verified) {
      sendError(res, 400, 'ALREADY_VERIFIED', 'Email is already verified');
      return;
    }

    // Send new OTP
    const otpResult = await sendOtp(user);

    if (otpResult.error) {
      console.error('OTP resend error:', otpResult.error);
      sendError(res, 500, 'OTP_SEND_FAILED', 'Failed to send verification code. Please try again.');
      return;
    }

    const { data: otp_verifications } = await supabase
      .from('otps')
      .select('expires_at')
      .eq('user_id', user.id)
      .single();

    sendSuccess(res, 200, 'A new 6-digit OTP has been sent to your email.', {
      otpExpires: otp_verifications?.expires_at
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while resending OTP');
  }
};

//verify user email
export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'User ID and OTP code are required');
    }

    // Find OTP for the user
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('otp_code', otpCode)
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !otpRecord) {
      // Check if OTP exists but is expired
      const { data: expiredOtp } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('otp_code', otpCode)
        .single();

      if (expiredOtp) {
        return sendError(res, 400, 'OTP_EXPIRED', 'This verification code has expired. Please request a new one.');
      }

      return sendError(res, 400, 'INVALID_OTP', 'Invalid verification code. Please check and try again.');
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('OTP update error:', updateError);
      return sendError(res, 500, 'VERIFICATION_FAILED', 'Failed to verify OTP. Please try again.');
    }

    // Update user's email_verified status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ is_email_verified: true })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('User update error:', userUpdateError);
      return sendError(res, 500, 'VERIFICATION_FAILED', 'Failed to update verification status. Please try again.');
    }

    return sendSuccess(res, 200, 'Email verified successfully. You can now log in.');

  } catch (error) {
    console.error('Verify OTP error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred during verification');
  }
};

// LOGIN USER
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check email verification
    if (!user.is_email_verified) {
      return sendError(res, 403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
    }

    // Device detection
    const getDeviceInfo = await getDevicesLocation_info(req);

    const { data: existingDevices } = await supabase
      .from('known_devices')
      .select('id')
      .eq('user_id', user.id);

    const isFirstLogin = !existingDevices || existingDevices.length === 0;

    if (await isDeviceNew(user.id, getDeviceInfo)) {
      if (!isFirstLogin) {
        await sendNewDeviceEmail(user.email, user.username, getDeviceInfo);
      }
      await saveDevice(user.id, getDeviceInfo);
    } else {
      await updateDeviceLastAccessed(user.id, getDeviceInfo);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokenPair(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return sendSuccess(res, 200, 'Login successful', {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred during login');
  }
};




// UPDATE USER PROFILE
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    if (!username && !email) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'At least one field (username or email) is required');
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid email format');
      }
      updateData.email = email;
      updateData.is_email_verified = false; // Require re-verification
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      if (error.code === '23505') {
        return sendError(res, 409, 'EMAIL_EXISTS', 'This email is already in use');
      }
      return sendError(res, 500, 'UPDATE_FAILED', 'Failed to update profile');
    }

    return sendSuccess(res, 200, 'Profile updated successfully', { user: data });

  } catch (error) {
    console.error('Update profile error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while updating profile');
  }
};

const activeRequests = new Map<string, boolean>();


//reset password request
export const resetPasswordRequest = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Email is required');
    }

    // Prevent duplicate requests
    const requestKey = `reset_${email}`;
    if (activeRequests.get(requestKey)) {
      return sendError(res, 429, 'REQUEST_IN_PROGRESS', 'A password reset request is already being processed');
    }

    activeRequests.set(requestKey, true);

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, username, is_email_verified')
        .eq('email', email)
        .single();

      if (userError || !user) {
        return sendError(res, 404, 'USER_NOT_FOUND', 'No account found with this email address');
      }

      if (!user.is_email_verified) {
        return sendError(res, 403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before resetting password');
      }

      const otpResult = await sendOtp(user?.email, true);
      
      if (otpResult.error) {
        console.error('Password reset OTP error:', otpResult.error);
        return sendError(res, 500, 'EMAIL_SEND_FAILED', 'Failed to send password reset email. Please try again.');
      }

      return sendSuccess(res, 200, 'Password reset link sent to your email', {
        email: user.email
      });

    } finally {
      activeRequests.delete(requestKey);
    }

  } catch (error) {
    console.error('Reset password request error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while processing password reset');
  }
};


//update user password
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Current password and new password are required');
    }

    if (newPassword.length < 8) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'New password must be at least 8 characters long');
    }

    // Get current password hash
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User account not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return sendError(res, 400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return sendError(res, 500, 'UPDATE_FAILED', 'Failed to update password');
    }

    // Revoke all tokens
    await revokeAllUserTokens(parseInt(req.user.id));

    return sendSuccess(res, 200, 'Password updated successfully. Please log in again.');

  } catch (error) {
    console.error('Update password error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while updating password');
  }
};


//refresh token endpoint 
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    if (!req?.user) {
      return sendError(res, 403, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }

    await revokeRefreshToken(refreshToken);
    const tokens = await generateTokenPair(req.user.id);

    return sendSuccess(res, 200, 'Tokens refreshed successfully', { tokens });

  } catch (error) {
    console.error('Refresh token error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while refreshing token');
  }
};



//logout endpoint 
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    const revoked = await revokeRefreshToken(refreshToken);

    if (revoked) {
      return sendSuccess(res, 200, 'Logged out successfully');
    } else {
      return sendError(res, 400, 'LOGOUT_FAILED', 'Failed to log out. Token may already be invalid.');
    }

  } catch (error) {
    console.error('Logout error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred during logout');
  }
};


//logout on all devices
export const logoutAll = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    await supabase
      .from('known_devices')
      .delete()
      .eq('user_id', req.user.id);

    const revoked = await revokeAllUserTokens(parseInt(req.user.id));

    if (revoked) {
      return sendSuccess(res, 200, 'Logged out from all devices successfully');
    } else {
      return sendError(res, 500, 'LOGOUT_ALL_FAILED', 'Failed to log out from all devices');
    }

  } catch (error) {
    console.error('Logout all error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred during logout');
  }
};


//get user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, email, is_email_verified, created_at')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User account not found');
    }

    return sendSuccess(res, 200, 'Profile retrieved successfully', { user });

  } catch (error) {
    console.error('Get profile error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while retrieving profile');
  }
};



//delete user account and logout on all devices
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const { id, authUserId } = req.params;

    if (!id || !authUserId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'User ID and Auth User ID are required');
    }

    // Delete from auth
    const authDeleted = await deleteAuthUser(authUserId);
    if (!authDeleted) {
      return sendError(res, 500, 'DELETE_FAILED', 'Failed to delete authentication data');
    }

    // Delete from users table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('User deletion error:', error);
      return sendError(res, 500, 'DELETE_FAILED', 'Failed to delete user account');
    }

    return sendSuccess(res, 200, 'User account deleted successfully');

  } catch (error) {
    console.error('Delete account error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while deleting account');
  }
};