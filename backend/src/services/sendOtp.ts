import { User } from '../lib/types';
import nodemailer from 'nodemailer'
import { generateOtp } from "../utils/otp";
import supabase from "../lib/supabase";

//node mailer setup
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: true,
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASSWORD
    }
})

const sentOtps = new Map<string, number>();

export const sendOtp = async (user: User, isForgotPassword: boolean = false) => {
    console.log('sendOtp called with:', { userId: user.id, email: user.email, isForgotPassword });
    
    // Check if OTP was sent recently (within last 30 seconds)
    const otpKey = `${user.id}_${isForgotPassword ? 'forgot' : 'verify'}`;
    const lastSent = sentOtps.get(otpKey);
    const now = Date.now();
    
    if (lastSent && (now - lastSent) < 30000) { 
        console.log('OTP recently sent, skipping duplicate');
        return { success: false, error: 'OTP already sent recently' };
    }
    
    const otp = generateOtp();
    console.log('Generated OTP:', otp);
    
    // otp expires at 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    console.log('Upserting OTP to database...');
    
    //upsert otp and overwrite new one 
    const { error } = await supabase
    .from('otp_verifications')
    .upsert({
        user_id: user.id,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        is_verified: false
    }, { onConflict: 'user_id' });

    if (error) {
        console.error('Database error while saving OTP:', error);
        return { success: false, error };
    }

    console.log('OTP saved to database successfully');

    //send email 
    const mailOptions = {
        from: `"NeuroVision" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'OTP Verification',
        html: `
        <p>Hello ${user.username},</p>
        <p>Your NeuroVision verification code is:</p>
        <h2>${otp}</h2>
        <p>This code will expire in 5 minutes.</p>
    `,
    }

    //forgot password 
    if (isForgotPassword) { 
        mailOptions.subject = 'Reset Password - NeuroVision';
        mailOptions.html = `
        <p>Hello ${user.username},</p>
        <p>Your reset password verification code is:</p>
        <h2>${otp}</h2>
        <p>This code will expire in 5 minutes.</p>
        <br />
        <p>If you did not request this password reset, please ignore this email.</p>
    `
    }

    console.log('Sending email to:', user.email);

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP ${otp} sent successfully to ${user.email}`);
        
        // Record the time this OTP was sent
        sentOtps.set(otpKey, now);
        
        // Clean up old entries (optional)
        setTimeout(() => {
            sentOtps.delete(otpKey);
        }, 60000); // Clean up after 1 minute
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Email sending failed:', error);
        if (error instanceof Error) {
            console.error('Email error message:', error.message);
        }
        return { success: false, error };
    }
}


