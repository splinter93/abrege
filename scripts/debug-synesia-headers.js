#!/usr/bin/env node

// Charger les variables d'environnement
require('dotenv').config({ path: '.env' });

const synesiaApiKey = process.env.SYNESIA_API_KEY;
const synesiaProjectId = process.env.SYNESIA_PROJECT_ID;

console.log('🔍 DEBUG HEADERS SYNESIA');
console.log('=========================');

console.log('\n📋 Configuration:');
console.log('API Key (premiers 20 chars):', synesiaApiKey ? `${synesiaApiKey.substring(0, 20)}...` : '❌ Manquant');
console.log('Project ID:', synesiaProjectId ? '✅ Présent' : '❌ Manquant');

if (!synesiaApiKey || !synesiaProjectId) {
  console.error('❌ Configuration manquante');
  process.exit(1);
}

async function debugHeaders() {
  console.log('\n🔍 Test avec différents formats de headers...');
  
  const testCases = [
    {
      name: 'Format standard',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${synesiaApiKey}`,
        "X-Project-ID": synesiaProjectId,
      }
    },
    {
      name: 'Sans préfixe ApiKey',
      headers: {
        "Content-Type": "application/json",
        "Authorization": synesiaApiKey,
        "X-Project-ID": synesiaProjectId,
      }
    },
    {
      name: 'Avec Bearer',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${synesiaApiKey}`,
        "X-Project-ID": synesiaProjectId,
      }
    },
    {
      name: 'Avec X-API-Key',
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": synesiaApiKey,
        "X-Project-ID": synesiaProjectId,
      }
    }
  ];
  
  const payload = {
    callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
    args: "Test",
    settings: {}
  };
  
  for (const testCase of testCases) {
    console.log(`\n   Test: ${testCase.name}`);
    try {
      const response = await fetch("https://api.synesia.app/execution?wait=true", {
        method: "POST",
        headers: testCase.headers,
        body: JSON.stringify(payload),
      });
      
      console.log(`   📡 Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Erreur: ${errorText}`);
      } else {
        console.log(`   ✅ Succès!`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
  
  console.log('\n📊 RÉSUMÉ');
  console.log('==========');
  console.log('Si tous les tests retournent 401, le problème peut être:');
  console.log('1. Clé API invalide ou expirée');
  console.log('2. Project ID incorrect');
  console.log('3. Callable ID incorrect');
  console.log('4. Permissions insuffisantes');
  console.log('5. Compte Synesia suspendu');
  
  console.log('\n🔧 RECOMMANDATIONS');
  console.log('==================');
  console.log('1. Vérifier la clé API dans le dashboard Synesia');
  console.log('2. Vérifier le Project ID');
  console.log('3. Vérifier le Callable ID');
  console.log('4. Contacter le support Synesia');
}

debugHeaders().catch(console.error); 