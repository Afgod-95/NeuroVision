import supabase from "../lib/supabase";
import { Response } from "express";
import { hashPassword } from "../utils/encryptedPassword";

// Helper to check required fields
const validateRegisterFields = (username: string, email: string, password: string, res: Response) => {
  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return false;
  }
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return false;
  }
  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return false;
  }
  return true;
};

// Helper to check if user exists
const checkUserExists = async (email: string, res: Response) => {
  const { data: existingUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError && userError.code !== 'PGRST116') {
    console.error(userError);
    res.status(500).json({ error: 'Error checking existing user' });
    return { exists: null, error: true };
  }

  if (existingUser) {
    res.status(400).json({ error: 'User already exists' });
    return { exists: true, error: false };
  }

  return { exists: false, error: false };
};

// Helper to create user
const createUser = async (username: string, email: string, password: string, res: Response) => {
  
  const hashedPassword = await hashPassword({ password });
  const { data: newUser, error: insertError, } = await supabase
    .from('users')
    .insert([{ username, email, password: hashedPassword }])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating user:', insertError);
    res.status(500).json({ error: 'Error creating user' });
    return null;
  }
  return newUser;
};


export { createUser, checkUserExists, validateRegisterFields }; 