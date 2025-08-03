#!/usr/bin/env node

// Charger les variables d'environnement
require('dotenv').config({ path: '.env' });

const synesiaApiKey = process.env.SYNESIA_API_KEY;
const synesiaProjectId = process.env.SYNESIA_PROJECT_ID;

console.log('🔑 TEST NOUVELLE CLÉ SYNESIA');
console.log('==============================');

console.log('\n📋 Configuration:');
console.log('API Key:', synesiaApiKey ? '✅ Présent' : '❌ Manquant');
console.log('Project ID:', synesiaProjectId ? '✅ Présent' : '❌ Manquant');

if (!synesiaApiKey || !synesiaProjectId) {
  console.error('❌ Configuration manquante');
  process.exit(1);
}

async function testNewKey() {
  console.log('\n🤖 Test API Synesia avec nouvelle clé...');
  
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
  
  try {
    const response = await fetch("https://api.synesia.app/execution?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `ApiKey ${synesiaApiKey}`,
        "X-Project-ID": synesiaProjectId,
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📡 Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Erreur:', errorText);
    } else {
      const data = await response.json();
      console.log('✅ Succès!');
      console.log('📝 Réponse:', data.result || data.response || 'Pas de réponse');
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

testNewKey().catch(console.error); 