import { Request, Response } from 'express';
import supabase from '../../lib/supabase';
import { sendOtp } from '../../services/sendOtp';
import {
  checkUserExists,
  validateRegisterFields,
  createUser
} from '../../helpers/userHelpers';
import { comparePassword, hashPassword } from '../../utils/encryptedPassword';
import { getDevicesLocation_info, isDeviceNew, saveDevice, sendNewDeviceEmail } from '../../services/devicesLoginDetector';
import { updateDeviceLastAccessed } from '../../helpers/lastAccessedDevice';

//register user endpoint
const registerUser = async (req: Request, res: Response) => {
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
        email: newUser.email
      });
    }

  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



//resend otp 
const resendOtp = async (req: Request, res: Response) => {
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
      });
    }

  } catch (error) {
    console.error('Error resending otp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


//verify user email
const verifyEmailOtp = async (req: Request, res: Response) => {
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
const loginUser = async (req: Request, res: Response) => {
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

    res.status(200).json({ message: 'Login successful', user });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// GET USER PROFILE
const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE USER PROFILE
const updateUserProfile = async (req: Request, res: Response) => {
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

// RESET PASSWORD
const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const hashedPassword = await hashPassword(newPassword)

    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', id)
      .single();

    if (error) {
      console.error('Reset error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    res.status(200).json({ message: 'Password reset successful', data });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// 1. Add request tracking to prevent duplicate calls
const activeRequests = new Map<string, boolean>();

const resetPasswordRequest = async (req: Request, res: Response) => {
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

      console.log('User found, sending OTP...');

      const otpResult = await sendOtp(user, true);
      if (otpResult.error) {
        console.error('OTP error:', otpResult.error);
        return res.status(500).json({ error: 'Failed to send OTP' });
      }

      console.log('OTP sent successfully');

      res.status(200).json({
        message: 'OTP sent successfully',
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

// LOGOUT USER
const logoutUser = async (req: Request, res: Response) => {
  try {
    // Token/session handling should be here
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE USER
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
const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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


//exports 
export {
  registerUser,
  loginUser,
  verifyEmailOtp,
  resendOtp,
  logoutUser,
  resetUserPassword,
  deleteUserAccount,
  resetPasswordRequest,
  updateUserProfile,
  getUserProfile,

}