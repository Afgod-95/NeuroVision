// user type
export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  is_email_verified: boolean;
  created_at: string;
};


//password encypt 
export type PasswordHash = {
  password: string
}

//password match 
export type PasswordMatch = { 
  password: string,
  hashedPassword: string
}