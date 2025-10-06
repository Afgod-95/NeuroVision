import { User } from '../lib/types';
import { Resend } from 'resend';
import { generateOtp } from "../utils/otp";
import supabase from "../lib/supabase";

// resend setup
export const resend = new Resend(process.env.RESEND_API_KEY);



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

    const mailOptions = {
        from: `"NeuroVision" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Your OTP Code - NeuroVision',
        html: `
          
            <div style="background-color: #0D0D0D; color: #FFFFFF; padding: 24px 16px; max-width: 100%; box-sizing: border-box;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 24px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.3);">
                <div style="font-family: 'sans-serif; max-width: 500px; margin: auto; padding: 24px; border-radius: 12px;">
                    <h2 style="text-align: center;">OTP Verification</h2>
                    
                    <p style="font-size: 16px; color: #fff">Hello ${user.username},</p>

                    <p style="font-size: 15px; line-height: 1.6;">
                        Your One-Time Password (OTP) for verifying your NeuroVision account is:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                       <span style="font-size: 24px; font-weight: bold;;">${otp}</span>
                    </div>

                    <p style="font-size: 13px;">
                        If you didn’t request this password reset, please ignore this email or contact support.
                    </p>

                    <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />

                    <footer style="font-size: 12px; text-align: center; color: #555;">
                        © ${new Date().getFullYear()} NeuroVision — All rights reserved.
                    </footer>
                </div>
            </div>
        `,
    };


    // send reset password magic link
    if (isForgotPassword) {
        mailOptions.subject = 'Reset Your Password - NeuroVision';
        mailOptions.html = `
            <div style="background-color: #0D0D0D; color: #FFFFFF; padding: 24px 16px; max-width: 100%; box-sizing: border-box;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #1A1A1A; padding: 24px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.3);">
                <h2 style="text-align: center; font-size: 22px; margin-bottom: 24px;">Reset Your Password</h2>
                
                <p style="font-size: 16px; margin: 0 0 12px;">Hello ${user.username},</p>

                <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                    You recently requested to reset your <strong>NeuroVision</strong> account password. Click the button below to proceed. 
                    This link will expire in <strong>15 minutes</strong> for security reasons.
                </p>

                <div style="text-align: center; color:white; margin: 32px 0;">
                    <a href="https://vercel.com"
                    style="display: inline-block; background-color: #9747FF; color: white; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; font-size: 16px;">
                    Reset Password
                    </a>
                </div>

                <p style="font-size: 13px; color: #BBBBBB; margin: 0 0 16px;">
                    If you didn’t request this password reset, please ignore this email or contact support.
                </p>

                <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />

                <footer style="font-size: 12px; text-align: center; color: #777;">
                    © ${new Date().getFullYear()} NeuroVision — All rights reserved.
                </footer>
                </div>
            </div>
        `
    }



    console.log('Sending email to:', user.email);

    try {
        const { data, error: sendError } = await resend.emails.send(mailOptions);
        if (sendError) {
            console.error('Resend email error:', sendError);
            return { success: false, error: sendError };
        }
        console.log(`OTP ${otp} sent successfully to ${user.email}`);

        // Record the time this OTP was sent
        sentOtps.set(otpKey, now);

        //log the resend response data
        console.log('Resend response data:', JSON.stringify(data));

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


