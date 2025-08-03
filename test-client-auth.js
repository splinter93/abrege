const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://hddhjwlaampspoqncubs.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testClientAuth() {
  console.log('🔐 Test d\'authentification côté client...\n');

  try {
    // 1. Vérifier l'état de la session
    console.log('1️⃣ Vérification de la session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Erreur Supabase:', error.message);
      return;
    }

    if (!session) {
      console.log('⚠️ Aucune session active');
      console.log('💡 Vous devez vous connecter via l\'interface web');
      return;
    }

    console.log('✅ Session active trouvée');
    console.log('👤 Utilisateur:', session.user.email);
    console.log('🔑 Token disponible:', session.access_token ? 'Oui' : 'Non');
    console.log('📅 Expire le:', new Date(session.expires_at * 1000).toLocaleString());

    // 2. Tester l'API avec le token
    console.log('\n2️⃣ Test de l\'API chat-sessions...');
    const response = await fetch('http://localhost:3002/api/v1/chat-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: 'Test Session Client',
        history_limit: 10
      })
    });

    console.log('📡 Réponse API:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Session créée avec succès:', data);
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Erreur création session:', errorData);
    }

    // 3. Tester la récupération des sessions
    console.log('\n3️⃣ Test de récupération des sessions...');
    const getResponse = await fetch('http://localhost:3002/api/v1/chat-sessions', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    console.log('📡 Réponse GET:', getResponse.status, getResponse.statusText);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ Sessions récupérées:', data);
    } else {
      const errorData = await getResponse.json().catch(() => ({}));
      console.log('❌ Erreur récupération sessions:', errorData);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testClientAuth(); 