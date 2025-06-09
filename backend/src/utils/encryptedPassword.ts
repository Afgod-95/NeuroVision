import bcrypt from 'bcrypt';
import { PasswordHash, PasswordMatch } from '../lib/types';

//hash password 
const hashPassword = async ({ password } : PasswordHash) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
}

//compare password
const comparePassword = async ({ password, hashedPassword } : PasswordMatch) => {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
}

export { hashPassword, comparePassword }; 
