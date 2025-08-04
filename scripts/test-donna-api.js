const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDonnaAPI() {
  console.log('🔍 TEST API AVEC DONNA');
  console.log('=' .repeat(40));

  try {
    // 1. Authentification
    console.log('\n🔐 1. Authentification...');
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('❌ Erreur authentification:', authError);
      console.log('💡 Assurez-vous d\'être connecté dans l\'application');
      return;
    }

    console.log('✅ Authentifié:', session.user.email);

    // 2. Récupérer Donna
    console.log('\n🤖 2. Récupération de Donna...');
    
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true);

    const donna = agents?.find(a => a.name.toLowerCase().includes('donna'));
    
    if (!donna) {
      console.error('❌ Donna non trouvée');
      return;
    }

    console.log('✅ Donna trouvée:', donna.name);

    // 3. Test de l'API
    console.log('\n🚀 3. Test de l\'API LLM...');
    
    const testMessage = "Salut Donna ! Comment ça va ?";
    const testContext = {
      type: 'chat_session',
      id: 'test-session',
      name: 'Test Session',
      agentId: donna.id
    };

    console.log('📤 Envoi de la requête...');
    console.log('   - Message:', testMessage);
    console.log('   - Agent ID:', donna.id);
    console.log('   - Modèle:', donna.model);

    const response = await fetch('http://localhost:3003/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        message: testMessage,
        context: testContext,
        history: [],
        provider: 'deepseek',
        channelId: `test-${Date.now()}`
      })
    });

    console.log('📥 Réponse reçue:');
    console.log('   - Status:', response.status);
    console.log('   - OK:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('   - Data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.error('   - Erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testDonnaAPI(); 