#!/usr/bin/env node

/**
 * Test d'écriture en streaming - Version simple
 * Lance un test immédiat avec des chunks de texte
 */

const NOTE_ID = 'd1f3f3d5-c308-49ed-838d-7e00939dfb85';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/v2/note/${NOTE_ID}/stream:write`;

// Instructions pour récupérer le token
console.log('🧪 Test d\'écriture en streaming');
console.log('📝 Note ID:', NOTE_ID);
console.log('');
console.log('⚠️  Pour récupérer le token JWT:');
console.log('   1. Ouvre la console du navigateur (F12)');
console.log('   2. Exécute: JSON.parse(localStorage.getItem(\'sb-localhost-auth-token\')).access_token');
console.log('   3. Copie le token et exécute:');
console.log(`      TOKEN="ton_token" node scripts/test-streaming-now.js`);
console.log('');
console.log('Ou passe le token comme argument:');
console.log(`  node scripts/test-streaming-now.js "ton_token"`);
console.log('');

const TOKEN = process.argv[2] || process.env.JWT_TOKEN || '';

if (!TOKEN) {
  console.log('❌ Token JWT requis');
  console.log('');
  console.log('Test rapide avec curl (depuis le terminal):');
  console.log('');
  console.log('TOKEN="ton_token"');
  console.log(`curl -X POST "${ENDPOINT}" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer $TOKEN" \\');
  console.log('  -d \'{"chunk":"Test streaming! ","position":"end"}\'');
  console.log('');
  process.exit(1);
}

// Fonction pour envoyer un chunk
async function sendChunk(chunk, isEnd = false) {
  const payload = {
    chunk,
    position: 'end',
    end: isEnd,
    metadata: {
      tool_call_id: `test-${Date.now()}`,
      agent_id: 'test-script',
      source: 'test-streaming-now'
    }
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Erreur:`, error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour attendre
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test principal
async function runTest() {
  console.log('🚀 Début du test...\n');

  const chunks = [
    '🧪 Test d\'écriture en streaming\n\n',
    'Ceci est un test pour vérifier que le streaming fonctionne correctement.\n\n',
    '## Chunks envoyés\n\n',
    '1. Premier chunk ✅\n',
    '2. Deuxième chunk ✅\n',
    '3. Troisième chunk ✅\n',
    '4. Quatrième chunk ✅\n',
    '5. Cinquième chunk ✅\n\n',
    '## Résultat\n\n',
    'Si tu vois ce texte apparaître progressivement dans l\'éditeur/canvas, le streaming fonctionne ! 🎉\n\n',
    '✅ Test terminé !'
  ];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isLast = i === chunks.length - 1;
    
    process.stdout.write(`📤 Chunk ${i + 1}/${chunks.length} (${chunk.length} chars)... `);
    
    const result = await sendChunk(chunk, isLast);
    
    if (result.success) {
      console.log('✅');
    } else {
      console.log('❌');
      console.error(`   Erreur: ${result.error}`);
      return;
    }
    
    // Délai entre les chunks (simulation du streaming)
    if (!isLast) {
      await sleep(200); // 200ms entre chaque chunk
    }
  }

  console.log('\n✅ Test terminé avec succès !');
  console.log('👀 Vérifie l\'éditeur/canvas pour voir le texte apparaître en temps réel.');
  console.log(`   URL: ${BASE_URL}/private/note/${NOTE_ID}`);
}

// Exécuter le test
runTest().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

