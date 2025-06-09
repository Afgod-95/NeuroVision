//6 digit otp generator function 
export const handleSendOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}


//send email function