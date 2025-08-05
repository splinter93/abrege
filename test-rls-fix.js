const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSFix() {
  console.log('🔍 Test de la correction RLS pour création classeurs');
  
  try {
    // 1. Essayer de se connecter avec l'utilisateur existant
    console.log('1️⃣ Tentative de connexion...');
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@scrivia.app',
      password: 'test123456'
    });

    if (authError) {
      console.log('❌ Erreur authentification:', authError.message);
      
      // 2. Si l'email n'est pas confirmé, essayer de créer un nouvel utilisateur
      if (authError.message.includes('Email not confirmed')) {
        console.log('2️⃣ Tentative de création d\'un nouvel utilisateur...');
        const { data: newUser, error: signUpError } = await supabase.auth.signUp({
          email: 'test2@scrivia.app',
          password: 'test123456'
        });
        
        if (signUpError) {
          console.log('❌ Erreur création utilisateur:', signUpError.message);
          return;
        }
        
        if (newUser.user) {
          console.log('✅ Nouvel utilisateur créé:', newUser.user.email);
          console.log('🔑 Session active:', newUser.session ? 'Oui' : 'Non');
          
          if (newUser.session) {
            await testAPIWithToken(newUser.session.access_token);
          }
        }
      }
      return;
    }

    if (user) {
      console.log('✅ Utilisateur authentifié:', user.id);
      
      // 3. Récupérer le token d'accès
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        console.log('✅ Token récupéré:', token.substring(0, 20) + '...');
        await testAPIWithToken(token);
      } else {
        console.log('❌ Token d\'accès manquant');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function testAPIWithToken(token) {
  console.log('\n🧪 Test de l\'API v2 avec token authentifié...');
  
  try {
    const response = await fetch('http://localhost:3000/api/v2/classeur/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        name: 'Test Classeur RLS Fix',
        description: 'Test de la correction RLS'
      })
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📊 Réponse:', result);

    if (response.ok) {
      console.log('✅ API v2 fonctionne avec la correction RLS !');
    } else {
      console.log('❌ API v2 retourne une erreur:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
  }
}

testRLSFix(); 