const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPublishEndpoint() {
  console.log('🧪 Test de l\'endpoint de publication...');
  
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
    
    // 2. Tester l'endpoint de publication avec authentification
    const response = await fetch('http://localhost:3000/api/ui/note/test-note-id/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ ispublished: true })
    });
    
    console.log(`📡 Status de la réponse: ${response.status}`);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('✅ Endpoint de publication fonctionne:', result);
    } else if (response.status === 404) {
      console.log('⚠️  Note non trouvée (normal pour un test avec un ID fictif)');
    } else if (response.status === 401) {
      console.log('❌ Authentification échouée');
    } else {
      const error = await response.text();
      console.log(`⚠️  Erreur ${response.status}:`, error);
    }
    
    // 3. Tester sans authentification (doit échouer)
    const responseNoAuth = await fetch('http://localhost:3000/api/ui/note/test-note-id/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ispublished: true })
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

testPublishEndpoint(); 