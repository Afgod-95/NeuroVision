export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/;
export interface PasswordRegex {
    passwordRegex: RegExp;
}

export const passwordRegex: RegExp = /.{6,}/;
export const phoneRegex = /^\+[1-9]\d{1,14}$/;
