import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Delete user from Supabase Auth
export const deleteAuthUser = async (authUserId: string) => {
  const { data, error } = await supabase.auth.admin.deleteUser(authUserId);
  if (error) throw error;
  return data;
};

export default supabase;
