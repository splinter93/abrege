const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFixes() {
  console.log('🧪 Test des corrections d\'authentification...');
  
  try {
    // 1. Se connecter pour obtenir un token
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123'
    });
    
    if (authError || !session) {
      console.log('❌ Impossible de se connecter pour le test');
      return;
    }
    
    console.log('✅ Connexion réussie, token obtenu');
    
    // 2. Tester un endpoint avec authentification
    const response = await fetch('http://localhost:3000/api/ui/notebooks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Endpoint /api/ui/notebooks fonctionne avec authentification');
    } else if (response.status === 401) {
      console.log('❌ Endpoint /api/ui/notebooks retourne 401 (authentification échouée)');
    } else {
      console.log(`⚠️  Endpoint /api/ui/notebooks retourne ${response.status}`);
    }
    
    // 3. Tester un endpoint sans authentification (doit échouer)
    const responseNoAuth = await fetch('http://localhost:3000/api/ui/notebooks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (responseNoAuth.status === 401) {
      console.log('✅ Endpoint rejette correctement les requêtes sans authentification');
    } else {
      console.log(`⚠️  Endpoint sans auth retourne ${responseNoAuth.status} (devrait être 401)`);
    }
    
    console.log('🎉 Tests terminés !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testAuthFixes(); 