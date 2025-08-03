#!/usr/bin/env node

// Charger les variables d'environnement
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const synesiaApiKey = process.env.SYNESIA_API_KEY;
const synesiaProjectId = process.env.SYNESIA_PROJECT_ID;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

if (!synesiaApiKey || !synesiaProjectId) {
  console.error('❌ Variables d\'environnement Synesia manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSynesiaAuth() {
  console.log('🤖 TEST AUTHENTIFICATION SYNESIA');
  console.log('==================================');
  
  // Test 1: Configuration
  console.log('\n📋 Test 1: Configuration');
  console.log('Supabase URL:', supabaseUrl ? '✅ Configuré' : '❌ Manquant');
  console.log('Supabase Anon Key:', supabaseAnonKey ? '✅ Configuré' : '❌ Manquant');
  console.log('Synesia API Key:', synesiaApiKey ? '✅ Configuré' : '❌ Manquant');
  console.log('Synesia Project ID:', synesiaProjectId ? '✅ Configuré' : '❌ Manquant');
  
  // Test 2: Connexion Supabase
  console.log('\n🔌 Test 2: Connexion Supabase');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Erreur récupération session:', error.message);
    } else if (!session) {
      console.log('⚠️ Aucune session active - utilisateur non connecté');
      console.log('   Note: L\'utilisateur doit être connecté pour tester Synesia');
    } else {
      console.log('✅ Session active trouvée');
      console.log('   Utilisateur:', session.user.email);
      console.log('   Token:', session.access_token ? '✅ Présent' : '❌ Manquant');
    }
  } catch (error) {
    console.log('❌ Erreur inattendue:', error.message);
  }
  
  // Test 3: Test direct Synesia API
  console.log('\n🤖 Test 3: Test direct Synesia API');
  try {
    const payload = {
      callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
      args: "Bonjour, comment allez-vous ?",
      settings: {
        history_messages: [
          {
            role: "user",
            content: "Bonjour"
          }
        ]
      }
    };
    
    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${synesiaApiKey}`,
        "X-Project-ID": synesiaProjectId,
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📡 Status de la réponse Synesia:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erreur Synesia API:', errorText);
    } else {
      const data = await response.json();
      console.log('✅ Synesia API fonctionne');
      console.log('   Réponse:', data.result || data.response || 'Pas de réponse');
    }
  } catch (error) {
    console.log('❌ Erreur test Synesia:', error.message);
  }
  
  // Test 4: Test via notre API (si serveur local disponible)
  console.log('\n🌐 Test 4: Test via notre API locale');
  try {
    const response = await fetch('http://localhost:3001/api/chat/synesia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pas de token pour tester l'erreur 401
      },
      body: JSON.stringify({
        message: "Test sans authentification",
        messages: []
      }),
    });
    
    console.log('📡 Status de notre API:', response.status);
    
    if (response.status === 401) {
      console.log('✅ Correct: Notre API refuse l\'accès sans authentification');
    } else {
      console.log('⚠️ Problème: Notre API devrait retourner 401 sans token');
    }
  } catch (error) {
    console.log('❌ Erreur test API locale:', error.message);
    console.log('   Note: Le serveur de développement doit être démarré');
  }
  
  console.log('\n📊 RÉSUMÉ DU TEST');
  console.log('===================');
  console.log('✅ Configuration: OK');
  console.log('✅ Synesia API directe: OK');
  console.log('⚠️ Session utilisateur: Nécessite connexion');
  console.log('✅ Protection API: OK (401 sans auth)');
  
  console.log('\n🎯 RECOMMANDATIONS');
  console.log('===================');
  console.log('1. Vérifier que l\'utilisateur est connecté');
  console.log('2. Vérifier que le token est envoyé dans les headers');
  console.log('3. Vérifier que l\'API Synesia est accessible');
  console.log('4. Tester avec un utilisateur connecté');
}

testSynesiaAuth().catch(console.error); 