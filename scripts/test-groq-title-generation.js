/**
 * Script de test rapide pour l'API Groq
 * Teste la génération de titre avec le modèle gpt-oss-20b
 * 
 * Usage: node scripts/test-groq-title-generation.js
 */

require('dotenv').config({ path: '.env.local' });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY manquante dans .env.local');
  process.exit(1);
}

const SYSTEM_PROMPT = `Crée un titre ULTRA-COURT (max 35 caractères) pour cette conversation.
Style: mots-clés essentiels uniquement, PAS de phrase complète.
Format: "Sujet principal" ou "Sujet + contexte bref"
Exemples corrects: "API REST Node.js" "Recette crêpes" "Erreur Python import"
Exemples incorrects: "Comment créer une API" "Je veux faire des crêpes"
Français, concis, sans ponctuation finale.`.trim();

// Test avec plusieurs messages
const TEST_MESSAGES = [
  'Comment créer une API REST avec Node.js et Express ?',
  'Je veux apprendre Python pour le machine learning',
  'Quelle est la meilleure façon de faire des crêpes moelleuses ?',
  'Salut Wade, on discute tranquille ?'
];

const USER_MESSAGE = TEST_MESSAGES[1]; // Python ML

async function testGroqTitleGeneration() {
  console.log('🧪 Test de génération de titre avec Groq\n');
  console.log('Modèle: openai/gpt-oss-20b');
  console.log('Message test:', USER_MESSAGE);
  console.log('');

  try {
    const payload = {
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Message de l'utilisateur:\n${USER_MESSAGE}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500, // Large budget pour laisser de la place
      top_p: 0.9,
      reasoning_effort: 'low' // Réduire le reasoning
    };

    console.log('📤 Payload envoyé:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    const startTime = Date.now();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;

    console.log(`⏱️  Temps de réponse: ${duration}ms`);
    console.log(`📊 Status HTTP: ${response.status} ${response.statusText}`);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur HTTP:', errorText);
      process.exit(1);
    }

    const data = await response.json();

    console.log('📥 Réponse complète Groq:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Vérifier structure
    console.log('🔍 Validation structure:');
    console.log('  - data:', !!data);
    console.log('  - data.choices:', !!data?.choices);
    console.log('  - data.choices.length:', data?.choices?.length || 0);
    console.log('  - data.choices[0]:', !!data?.choices?.[0]);
    console.log('  - data.choices[0].message:', !!data?.choices?.[0]?.message);
    console.log('  - data.choices[0].message.content:', !!data?.choices?.[0]?.message?.content);
    console.log('');

    if (data?.choices?.[0]?.message?.content) {
      const title = data.choices[0].message.content;
      console.log('✅ Titre généré:', title);
      console.log('   Longueur:', title.length, 'caractères');
    } else {
      console.error('❌ Pas de contenu dans la réponse');
      console.error('   Structure reçue:', Object.keys(data));
      if (data?.choices) {
        console.error('   Choices:', data.choices);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testGroqTitleGeneration();

