import { Twilio } from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are not set in environment variables.");
}


// sending verification code via SMS using Twilio Verify API
export const sendVerification = async (to: string, channel: 'sms') => {
    const verification = await client.verify.v2.services("VA4b5792f62f1fe4db5bbeb8089fdf08a6")
    .verifications
    .create({ to, channel });
    return verification;  
}


// Verify the code sent to the user
export const verifyCode = async (to: string, code: string) => {
    const verification = await client.verify.v2.services("VA4b5792f62f1f4db5bbeb8089fdf08a6")
    .verificationChecks
    .create({ to, code });
    return verification;
};
