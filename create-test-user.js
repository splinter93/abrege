const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
  console.log('👤 Création d\'un utilisateur de test...\n');

  const testEmail = 'test@abrege.local';
  const testPassword = 'test123456';

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    console.log('1️⃣ Vérification de l\'utilisateur existant...');
    const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (existingUser.user) {
      console.log('✅ Utilisateur de test existe déjà:', existingUser.user.email);
      console.log('🔑 Session active:', existingUser.session ? 'Oui' : 'Non');
      
      if (existingUser.session) {
        console.log('🎯 Vous pouvez maintenant tester le chat !');
        console.log('📝 Allez sur http://localhost:3002 et les sessions devraient apparaître');
      }
      return;
    }

    // 2. Créer un nouvel utilisateur
    console.log('2️⃣ Création d\'un nouvel utilisateur de test...');
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpError) {
      console.log('❌ Erreur création utilisateur:', signUpError.message);
      return;
    }

    if (newUser.user) {
      console.log('✅ Utilisateur de test créé:', newUser.user.email);
      console.log('🔑 Session active:', newUser.session ? 'Oui' : 'Non');
      
      if (newUser.session) {
        console.log('🎯 Vous pouvez maintenant tester le chat !');
        console.log('📝 Allez sur http://localhost:3002 et les sessions devraient apparaître');
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
  }
}

createTestUser(); 