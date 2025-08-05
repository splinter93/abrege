const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthV2() {
  console.log('🔍 Test d\'authentification API V2');
  
  try {
    // 1. Authentification avec un utilisateur de test
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@scrivia.app',
      password: 'test123456'
    });

    if (authError || !user) {
      console.error('❌ Erreur authentification:', authError);
      return;
    }

    console.log('✅ Utilisateur authentifié:', user.id);

    // 2. Récupérer le token d'accès
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.error('❌ Token d\'accès manquant');
      return;
    }

    console.log('✅ Token récupéré:', token.substring(0, 20) + '...');

    // 3. Test de l'endpoint v2 classeur/create
    console.log('\n🧪 Test endpoint /api/v2/classeur/create');
    
    const response = await fetch('http://localhost:3000/api/v2/classeur/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        name: 'Test Classeur V2',
        description: 'Classeur de test pour vérifier l\'authentification'
      })
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📊 Réponse:', result);

    if (response.ok) {
      console.log('✅ Endpoint v2 classeur/create fonctionne correctement');
    } else {
      console.error('❌ Erreur endpoint v2 classeur/create:', result.error);
    }

    // 4. Test de l'endpoint v2 note/create pour comparaison
    console.log('\n🧪 Test endpoint /api/v2/note/create');
    
    const noteResponse = await fetch('http://localhost:3000/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        source_title: 'Test Note V2',
        notebook_id: 'test-notebook-id',
        markdown_content: '# Test\n\nContenu de test'
      })
    });

    console.log('📊 Status note:', noteResponse.status);
    const noteResult = await noteResponse.json();
    console.log('📊 Réponse note:', noteResult);

    if (noteResponse.ok) {
      console.log('✅ Endpoint v2 note/create fonctionne correctement');
    } else {
      console.error('❌ Erreur endpoint v2 note/create:', noteResult.error);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testAuthV2(); 