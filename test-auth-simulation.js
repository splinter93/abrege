const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthSimulation() {
  console.log('🔐 Test de simulation d\'authentification...\n');

  try {
    // 1. Vérifier l'état actuel de l'authentification
    console.log('1️⃣ État actuel de l\'authentification...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Erreur Supabase:', error.message);
      return;
    }

    if (!session) {
      console.log('⚠️ Aucune session active - utilisateur non connecté');
      console.log('💡 Pour tester le chat, vous devez vous connecter via l\'interface Supabase');
      console.log('📝 Instructions:');
      console.log('   1. Allez sur https://hddhjwlaampspoqncubs.supabase.co/');
      console.log('   2. Connectez-vous avec vos identifiants');
      console.log('   3. Revenez sur http://localhost:3002');
      console.log('   4. Les sessions apparaîtront dans la sidebar');
      return;
    }

    console.log('✅ Utilisateur connecté:', session.user.email);
    console.log('🔑 Token disponible:', session.access_token ? 'Oui' : 'Non');

    // 2. Tester l'API avec le token
    console.log('\n2️⃣ Test de l\'API avec authentification...');
    const response = await fetch('http://localhost:3002/api/v1/chat-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: 'Test Session via API',
        history_limit: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Session créée avec succès:', data);
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Erreur création session:', response.status, errorData);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testAuthSimulation(); 