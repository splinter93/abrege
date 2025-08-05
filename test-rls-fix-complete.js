const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSFixComplete() {
  console.log('🔍 Test complet de la correction RLS pour API v2');
  
  try {
    // 1. Créer un nouvel utilisateur avec un email valide
    console.log('1️⃣ Création d\'un utilisateur de test...');
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: 'test-rls@scrivia.app',
      password: 'test123456'
    });
    
    if (signUpError) {
      console.log('❌ Erreur création utilisateur:', signUpError.message);
      return;
    }
    
    if (newUser.user) {
      console.log('✅ Utilisateur créé:', newUser.user.email);
      console.log('🔑 Session active:', newUser.session ? 'Oui' : 'Non');
      
      if (newUser.session) {
        await testAllEndpoints(newUser.session.access_token);
      } else {
        console.log('⚠️ Pas de session active, tentative de connexion...');
        
        // Essayer de se connecter
        const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'test-rls@scrivia.app',
          password: 'test123456'
        });
        
        if (signInError) {
          console.log('❌ Erreur connexion:', signInError.message);
          return;
        }
        
        if (session) {
          console.log('✅ Connexion réussie');
          await testAllEndpoints(session.access_token);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function testAllEndpoints(token) {
  console.log('\n🧪 Test de tous les endpoints API v2...');
  
  const endpoints = [
    {
      name: 'Liste classeurs',
      url: 'http://localhost:3000/api/v2/classeurs',
      method: 'GET'
    },
    {
      name: 'Création classeur',
      url: 'http://localhost:3000/api/v2/classeur/create',
      method: 'POST',
      body: {
        name: 'Test Classeur RLS Fix',
        description: 'Test de la correction RLS complète'
      }
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Test: ${endpoint.name}`);
    
    try {
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-Type': 'test'
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(endpoint.url, options);
      
      console.log(`📊 Status: ${response.status}`);
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name} fonctionne !`);
        if (endpoint.name === 'Création classeur' && result.classeur) {
          console.log(`📝 Classeur créé avec ID: ${result.classeur.id}`);
        }
      } else {
        console.log(`❌ ${endpoint.name} échoue:`, result.error);
        
        // Analyser l'erreur
        if (result.error && result.error.includes('row-level security')) {
          console.log('🔍 Problème RLS détecté');
        } else if (result.error && result.error.includes('Token')) {
          console.log('🔍 Problème d\'authentification');
        } else {
          console.log('🔍 Autre problème');
        }
      }
      
    } catch (error) {
      console.error(`❌ Erreur lors du test de ${endpoint.name}:`, error.message);
    }
  }
}

testRLSFixComplete(); 