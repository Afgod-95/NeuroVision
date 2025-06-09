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

//send otp 
const sendOtp = async (user: User) => {
    const otp = generateOtp();
    // otp expires at 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    //upsert otp and overwrite new one 
    const { error } = await supabase
    .from('otp_verifications')
    .upsert({
        user_id: user.id,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        is_verified: false
    },{ onConflict: 'user_id' });

    if (error) {
        console.error('Failed to send otp', error);
        return { success: false, error };
    }

    //send email 
    const mailOptions = {
        from: `"NueroVision" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'OTP Verification',
        html: `
        <p>Hello ${user.username},</p>
        <p>Your NeuroVision verification code is:</p>
        <h2>${otp}</h2>
        <p>This code will expire in 10 minutes.</p>
    `,
    }

    try{
        await transporter.sendMail(mailOptions);
        console.log(`Otp ${otp} sent to user`, user.email);
        return { success: true, error: null };
    }

    catch (error){
        if (error instanceof Error) {
            console.error('Failed to send otp', error.message);
        } else {
            console.error('Failed to send otp', error);
        }
        return { success: false, error };
    }
}

export { sendOtp };