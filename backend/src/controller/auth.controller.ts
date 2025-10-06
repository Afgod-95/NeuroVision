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

//register user endpoint
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!validateRegisterFields(username, email, password, res)) return;

    const userExistsResult = await checkUserExists(email, res);
    if (userExistsResult.error || userExistsResult.exists) return;

    const newUser = await createUser(username, email, password, res);
    if (!newUser) {
      return res.status(500).json({ error: 'Failed to create user' });
    };

    const otpResult = await sendOtp(newUser);
    const { data: otp_verifications, error: error } = await supabase
      .from('otps')
      .select('expires_at')
      .eq('user_id', newUser.id)
      .single();

    if (otpResult.error) {
      console.log(otpResult)
      return res.status(500).json({ error: 'Failed to send OTP', details: otpResult.error });
    }

    if (otpResult.success) {
      return res.status(201).json({
        message: `User created successfully. \n
        A 6 digit otp has been sent to your mail. Please check and verify.
      `,
        otp: otpResult,
        userId: newUser.id,
        email: newUser.email,
        otpExpires: otp_verifications?.expires_at,
      });
    }

  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



//resend otp 
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(500).json({
        error: "Email not found"
      })
    }

    // Fetch the full user object by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    const { data: otp_verifications, error: otpError } = await supabase
      .from('otp_verifications')
      .select('expires_at')
      .eq('user_id', user.id)
      .single();

    if (otpError || !otp_verifications) {
      return res.status(404).json({ error: 'OTP not found' });
    }

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otpResult = await sendOtp(user);

    if (otpResult.error) {
      console.log(otpResult)
      return res.status(500).json({ error: 'Failed to send OTP', details: otpResult.error });
    }

    if (otpResult.success) {
      return res.status(201).json({
        message: `A 6 digit otp has been sent to your mail. Please re-check and verify again.`,
        otp: otpResult,
        otpExpires: otp_verifications.expires_at,
      });
    }

  } catch (error) {
    console.error('Error resending otp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


//verify user email
export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      return res.status(400).json({ error: 'User ID and OTP code are required' });
    }

    // 1. Find OTP for the user
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('otp_code', otpCode)
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    

    // 2. Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({
        is_verified: true,
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }

    // 3. Update user's email_verified status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ is_email_verified: true })
      .eq('id', userId);

    if (userUpdateError) {
      console.error(userUpdateError);
      return res.status(500).json({ error: 'Failed to update user verification status' });
    }

    res.status(200).json({ message: 'Email verified successfully.' });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// LOGIN USER
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await comparePassword({ password, hashedPassword: user.password });
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Temporary password check
    if (!password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    // Add logging to debug
    console.log('Getting device info...');
    const getDeviceInfo = await getDevicesLocation_info(req);
    console.log('Device info received:', getDeviceInfo);

    // Check if user has any known devices
    const { data: existingDevices } = await supabase
      .from('known_devices')
      .select('id')
      .eq('user_id', user.id);

    const isFirstLogin = !existingDevices || existingDevices.length === 0;

    if (await isDeviceNew(user.id, getDeviceInfo)) {
      console.log('New device detected');

      // Only send email if it's NOT the first login
      if (!isFirstLogin) {
        console.log('Sending new device email...');
        await sendNewDeviceEmail(user.email, user.username, getDeviceInfo);
      } else {
        console.log('First login detected - skipping email notification');
      }

      // Always save the device (whether first login or not)
      await saveDevice(user.id, getDeviceInfo);
    } else {
      console.log('Known device detected - updating last accessed time');
      // Update last accessed time for existing device
      await updateDeviceLastAccessed(user.id, getDeviceInfo);
    }

    //generate token
    const { accessToken, refreshToken } = await generateTokenPair(user.id);

    res.status(200).json({
      message: 'Login successful',
      user,
      token: {
        accessToken,
        refreshToken,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// UPDATE USER PROFILE
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ username, email })
      .eq('id', id)
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ error: 'Error updating user profile' });
    }

    res.status(200).json({ message: 'Profile updated', data });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};




// 1. Add request tracking to prevent duplicate calls
const activeRequests = new Map<string, boolean>();

export const resetPasswordRequest = async (req: Request, res: Response) => {
  try {
    console.log('Reset password request received');
    console.log('Request body:', req.body);
    console.log('Request method:', req.method);
    console.log('Request path:', req.path);

    const { email } = req.body;

    if (!email) {
      console.log('No email provided in request');
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if there's already an active request for this email
    const requestKey = `reset_${email}`;
    if (activeRequests.get(requestKey)) {
      console.log('Duplicate request detected for email:', email);
      return res.status(429).json({ error: 'Request already in progress' });
    }

    // Mark this request as active
    activeRequests.set(requestKey, true);

    try {
      console.log('Looking for user with email:', email);

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, password, is_email_verified, created_at')
        .eq('email', email)
        .single();

      if (error || !user) {
        console.log('User not found:', error);
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.is_email_verified === false) {
        return res.status(404).json({ error: "User email is not verified" })
      }

      console.log('User found, sending OTP...');

      const otpResult = await sendOtp(user, true);
      if (otpResult.error) {
        console.error('OTP error:', otpResult.error);
        return res.status(500).json({ error: 'An error occured whilst sending password reset link' });
      }

      console.log('Password reset link sent successfully');

      res.status(200).json({
        message: 'Password reset link sent successfully',
        otpResult,
        user: { id: user.id, email: user.email, username: user.username }
      });
    } finally {
      // Always clear the active request flag
      activeRequests.delete(requestKey);
    }
  } catch (error) {
    console.error('Reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



export const updatePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'User not authenticated'
            });
        }

        // Get current password hash
        const { data: user, error } = await supabase
            .from('users')
            .select('password')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({
                error: 'USER_NOT_FOUND',
                message: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'INVALID_PASSWORD',
                message: 'Current password is incorrect'
            });
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
            return res.status(500).json({
                error: 'UPDATE_FAILED',
                message: 'Failed to update password'
            });
        }

        // Revoke all existing refresh tokens (force re-login)
        await revokeAllUserTokens(parseInt(req.user.id));

        res.json({ message: 'Password updated successfully. Please log in again.' });

    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Internal server error'
        });
    }
};



// refresh token 
export const refreshToken = async (req: Request, res: Response) => {

  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // The verifyRefreshToken middleware should have validated the token
    // and set req.user, so we can generate new tokens
    if (!req?.user) {
      return res.status(403).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid refresh token'
      });
    }

    //revoke the old refresh token 
    await revokeRefreshToken(refreshToken);

    //generate new token pair
    const tokens = await generateTokenPair(req?.user?.id);
    res.json({
      message: 'Tokens refreshed successfully',
      tokens
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Logout user (revoke refresh token)
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'MISSING_TOKEN',
      message: 'Refresh token is required'
    });
  }

  try {
    const revoked = await revokeRefreshToken(refreshToken);

    if (revoked) {
      res.json({ message: 'Logged out successfully' });
    } else {
      res.status(400).json({
        error: 'LOGOUT_FAILED',
        message: 'Failed to revoke refresh token'
      });
    }

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};

// Logout user from all devices
export const logoutAll = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

   // Check if user has any known devices
    const { data: existingDevices, error: deleteError } = await supabase
      .from('known_devices')
      .delete()
      .eq('user_id', req.user.id);
    const revoked = await revokeAllUserTokens(parseInt(req.user.id));

    if (revoked) {
      res.json({ message: 'Logged out from all devices successfully' });
    } else {
      res.status(500).json({
        error: 'LOGOUT_ALL_FAILED',
        message: 'Failed to revoke all tokens'
      });
    }

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    // Get fresh user data from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, is_email_verified, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_email_verified: user.is_email_verified,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};



// Helper function for handling Supabase errors
const handleSupabaseError = (res: Response, error: any, message: string) => {
  if (error) {
    console.error(message, error);
    res.status(500).json({ error: message });
    return true;
  }
  return false;
};


//delete user account
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const { id, authUserId } = req.params;

    //delete user from auth table
    await deleteAuthUser(authUserId);

    //delete user data from users table which is referenced to other tables
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);


    if (handleSupabaseError(res, error, 'Error deleting user account')) return;

    res.status(200).json({ message: 'User account deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};




