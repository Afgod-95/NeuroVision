import bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
  if (!password) throw new Error('Password is required for hashing');
  const saltRounds = 10; // You can adjust this
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  if (!password || !hashedPassword) throw new Error('Missing arguments for password comparison');
  return await bcrypt.compare(password, hashedPassword);
};
