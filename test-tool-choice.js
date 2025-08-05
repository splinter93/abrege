// Test du tool_choice pour Together AI

console.log('🔧 TEST TOOL_CHOICE TOGETHER AI');
console.log('=================================');

// Simulation du payload avec et sans tool_choice
const payloadWithoutToolChoice = {
  model: 'openai/gpt-oss-120b',
  messages: [
    { role: 'user', content: 'Créer une note "Test Tool Choice"' }
  ],
  stream: true,
  temperature: 0.7,
  max_tokens: 4000,
  top_p: 0.9,
  tools: [
    {
      type: 'function',
      function: {
        name: 'create_note',
        description: 'Créer une nouvelle note',
        parameters: {
          type: 'object',
          properties: {
            source_title: { type: 'string' },
            notebook_id: { type: 'string' }
          },
          required: ['source_title', 'notebook_id']
        }
      }
    }
  ]
};

const payloadWithToolChoice = {
  model: 'openai/gpt-oss-120b',
  messages: [
    { role: 'user', content: 'Créer une note "Test Tool Choice"' }
  ],
  stream: true,
  temperature: 0.7,
  max_tokens: 4000,
  top_p: 0.9,
  tools: [
    {
      type: 'function',
      function: {
        name: 'create_note',
        description: 'Créer une nouvelle note',
        parameters: {
          type: 'object',
          properties: {
            source_title: { type: 'string' },
            notebook_id: { type: 'string' }
          },
          required: ['source_title', 'notebook_id']
        }
      }
    }
  ],
  tool_choice: 'auto' // ✅ FORCE l'utilisation des tools
};

console.log('\n📤 PAYLOAD SANS TOOL_CHOICE:');
console.log(JSON.stringify(payloadWithoutToolChoice, null, 2));

console.log('\n📤 PAYLOAD AVEC TOOL_CHOICE:');
console.log(JSON.stringify(payloadWithToolChoice, null, 2));

console.log('\n🔍 DIFFÉRENCES:');
console.log('   - Sans tool_choice: Le modèle peut choisir de répondre en texte');
console.log('   - Avec tool_choice: "auto" force l\'utilisation des tools si disponibles');

console.log('\n📊 COMPARAISON:');
console.log('   - tool_choice: "none" → Jamais de function calls');
console.log('   - tool_choice: "auto" → Function calls si nécessaire (recommandé)');
console.log('   - tool_choice: { type: "function", function: { name: "create_note" } } → Force un tool spécifique');

console.log('\n✅ RÉSULTAT ATTENDU:');
console.log('   Avec tool_choice: "auto", Together AI devrait:');
console.log('   1. Détecter que l\'utilisateur veut créer une note');
console.log('   2. Utiliser le tool create_note automatiquement');
console.log('   3. Retourner un tool call au lieu de texte');

console.log('\n🎯 CONCLUSION:');
console.log('   Le paramètre tool_choice: "auto" est crucial pour forcer');
console.log('   l\'utilisation des function calls au lieu de réponses textuelles !'); 