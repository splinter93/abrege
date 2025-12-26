#!/usr/bin/env node

/**
 * Script de test pour l'écriture en streaming
 * 
 * Usage:
 *   node scripts/test-streaming-write.js <noteId> [token]
 * 
 * Si le token n'est pas fourni, le script essaiera de le récupérer depuis localStorage
 * (nécessite d'être exécuté depuis le navigateur ou d'avoir le token en variable d'env)
 */

const NOTE_ID = process.argv[2] || 'd1f3f3d5-c308-49ed-838d-7e00939dfb85';
const TOKEN = process.argv[3] || process.env.JWT_TOKEN || '';

if (!TOKEN) {
  console.error('❌ Token JWT requis. Fournissez-le comme argument ou via JWT_TOKEN env var.');
  console.error('Usage: node scripts/test-streaming-write.js <noteId> <token>');
  process.exit(1);
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/v2/note/${NOTE_ID}/stream:write`;

// Texte à envoyer en streaming (simulation d'un LLM qui écrit progressivement)
const TEXT_TO_STREAM = `# Test d'écriture en streaming

Ceci est un test d'écriture en streaming pour la note ${NOTE_ID}.

## Fonctionnalités testées

1. **Envoi de chunks progressifs** : Le texte est envoyé par petits morceaux
2. **Affichage en temps réel** : Les chunks doivent apparaître dans l'éditeur/canvas en temps réel
3. **Position d'insertion** : Le texte est inséré à la fin du document

### Détails techniques

- Endpoint utilisé : \`POST /api/v2/note/{ref}/stream:write\`
- Format : JSON avec \`chunk\` (string) et \`position\` (end/start/cursor)
- Broadcast : Via StreamBroadcastService vers les clients SSE

## Conclusion

Si tu vois ce texte apparaître progressivement dans l'éditeur, le streaming fonctionne ! 🎉

`;

// Fonction pour envoyer un chunk
async function sendChunk(chunk, position = 'end', isEnd = false) {
  const payload = {
    chunk,
    position,
    end: isEnd,
    metadata: {
      tool_call_id: `test-${Date.now()}`,
      agent_id: 'test-script',
      source: 'test-streaming-write'
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
    console.error(`❌ Erreur lors de l'envoi du chunk:`, error.message);
    return { success: false, error: error.message };
  }
}

// Fonction principale : envoyer le texte en streaming
async function streamText() {
  console.log(`🚀 Début du test d'écriture en streaming`);
  console.log(`📝 Note ID: ${NOTE_ID}`);
  console.log(`🌐 Endpoint: ${ENDPOINT}`);
  console.log(`📊 Taille du texte: ${TEXT_TO_STREAM.length} caractères\n`);

  // Diviser le texte en chunks de ~50 caractères pour simuler un vrai streaming
  const CHUNK_SIZE = 50;
  const chunks = [];
  
  for (let i = 0; i < TEXT_TO_STREAM.length; i += CHUNK_SIZE) {
    chunks.push(TEXT_TO_STREAM.slice(i, i + CHUNK_SIZE));
  }

  console.log(`📦 Nombre de chunks à envoyer: ${chunks.length}\n`);

  // Envoyer chaque chunk avec un délai pour simuler un vrai streaming
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isLast = i === chunks.length - 1;
    
    console.log(`📤 Envoi chunk ${i + 1}/${chunks.length} (${chunk.length} chars)${isLast ? ' [FIN]' : ''}`);
    
    const result = await sendChunk(chunk, 'end', isLast);
    
    if (!result.success) {
      console.error(`❌ Échec du chunk ${i + 1}`);
      return;
    }
    
    // Délai entre les chunks (simulation du streaming)
    if (!isLast) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms entre chaque chunk
    }
  }

  console.log(`\n✅ Test terminé ! ${chunks.length} chunks envoyés avec succès.`);
  console.log(`👀 Vérifie l'éditeur/canvas pour voir le texte apparaître en temps réel.`);
}

// Exécuter le test
streamText().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

