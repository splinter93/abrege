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

// Validation des variables d'environnement
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test the connection
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase client created:', !!supabase);
  
  // Test de connexion
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ Erreur lors du test de connexion Supabase:', error);
    } else {
      console.log('✅ Test de connexion Supabase réussi');
      if (data.session) {
        console.log('🔐 Session existante trouvée');
      } else {
        console.log('🔓 Aucune session existante');
      }
    }
  });
} 