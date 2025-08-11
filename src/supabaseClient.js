import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging for development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase Client Initialization:');
  console.log('🔧 URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('🔧 Key:', supabaseAnonKey ? 'SET' : 'NOT SET');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase env vars are missing in development');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase client created:', !!supabase);
} 