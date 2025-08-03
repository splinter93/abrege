const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFix() {
  console.log('🔍 Test de l\'authentification et création de dossier...');
  
  try {
    // 1. Récupérer la session actuelle
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erreur récupération session:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ Aucune session active, test avec authentification manquante...');
      
      // Test sans authentification (doit échouer)
      const response = await fetch('http://localhost:3000/api/v1/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Folder',
          notebook_id: 'test-notebook'
        })
      });
      
      if (response.status === 401) {
        console.log('✅ Test réussi: API rejette les requêtes non authentifiées');
      } else {
        console.log('❌ Test échoué: API devrait rejeter les requêtes non authentifiées');
      }
      
      return;
    }
    
    console.log('✅ Session trouvée pour utilisateur:', session.user.id);
    
    // 2. Test avec authentification
    const response = await fetch('http://localhost:3000/api/v1/folder/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        name: 'Test Folder Auth Fix',
        notebook_id: 'test-notebook'
      })
    });
    
    console.log('📡 Status de la réponse:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test réussi: Dossier créé avec authentification');
      console.log('📋 Résultat:', result);
    } else {
      const error = await response.text();
      console.log('❌ Test échoué: Erreur lors de la création du dossier');
      console.log('📋 Erreur:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testAuthFix(); 