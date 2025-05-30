// function to export 6 digit code
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
