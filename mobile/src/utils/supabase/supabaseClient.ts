import { createClient } from '@supabase/supabase-js';
import Constants  from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseKey = Constants.expoConfig?.extra?.supabaseServiceKey;
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
