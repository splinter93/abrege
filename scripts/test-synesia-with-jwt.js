#!/usr/bin/env node

// Charger les variables d'environnement
require('dotenv').config({ path: '.env' });

const synesiaApiKey = process.env.SYNESIA_API_KEY;
const synesiaProjectId = process.env.SYNESIA_PROJECT_ID;

console.log('🔐 TEST SYNESIA AVEC JWT');
console.log('==========================');

console.log('\n📋 Configuration:');
console.log('Synesia API Key:', synesiaApiKey ? '✅ Présent' : '❌ Manquant');
console.log('Synesia Project ID:', synesiaProjectId ? '✅ Présent' : '❌ Manquant');

if (!synesiaApiKey || !synesiaProjectId) {
  console.error('❌ Configuration Synesia manquante');
  process.exit(1);
}

async function testWithJWT() {
  console.log('\n🔐 Test 1: Requête sans JWT (devrait retourner 401)');
  
  try {
    const response = await fetch("http://localhost:3001/api/chat/synesia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pas de Authorization header
      },
      body: JSON.stringify({
        message: "Test message",
        messages: [],
        streaming: false,
        sessionId: "test-session"
      }),
    });
    
    console.log('📡 Status:', response.status);
    const responseText = await response.text();
    console.log('📝 Réponse:', responseText);
    
    if (response.status === 401) {
      console.log('✅ Correct: 401 sans JWT');
    } else {
      console.log('❌ Problème: Pas de 401 sans JWT');
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
  
  console.log('\n🔑 Test 2: Requête avec JWT invalide (devrait retourner 401)');
  
  try {
    const response = await fetch("http://localhost:3001/api/chat/synesia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-jwt-token"
      },
      body: JSON.stringify({
        message: "Test message",
        messages: [],
        streaming: false,
        sessionId: "test-session"
      }),
    });
    
    console.log('📡 Status:', response.status);
    const responseText = await response.text();
    console.log('📝 Réponse:', responseText);
    
    if (response.status === 401) {
      console.log('✅ Correct: 401 avec JWT invalide');
    } else {
      console.log('❌ Problème: Pas de 401 avec JWT invalide');
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
  
  console.log('\n💡 CONCLUSION');
  console.log('==============');
  console.log('Si les deux tests retournent 401, notre authentification JWT fonctionne.');
  console.log('Le problème Synesia 401 est séparé de l\'authentification JWT.');
  console.log('Il faut corriger la clé API Synesia.');
}

testWithJWT().catch(console.error); 