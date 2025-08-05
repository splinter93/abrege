import { agentIntentParser } from './agentIntentParser';

// Test simple des patterns
console.log('🧪 TEST SIMPLE DES PATTERNS');
console.log('============================');

const testMessage = "Créer une note 'Mon analyse'";
console.log('Message:', testMessage);

// Test avec différents patterns
const patterns = [
  /créer une note/i,
  /créer.*note/i,
  /créer.*['"]([^'"]+)['"]/i,
  /(?:créer|créé|nouvelle?)\s+(?:note|document)\s+['"]([^'"]+)['"]/i
];

patterns.forEach((pattern, index) => {
  const match = testMessage.match(pattern);
  console.log(`Pattern ${index + 1}: ${pattern.source}`);
  console.log(`Match:`, match);
  console.log('---');
});

// Test du parser d'intentions
console.log('\n🧪 TEST DU PARSER D\'INTENTIONS');
console.log('================================');

const testCases = [
  {
    message: "Créer une note 'Mon analyse' avec le contenu 'Voici mon analyse...'",
    capabilities: ['note:create', 'note:update', 'note:add-content']
  },
  {
    message: "Ajouter 'nouveau contenu' à la note 'Mon analyse'",
    capabilities: ['note:create', 'note:update', 'note:add-content']
  },
  {
    message: "Déplacer la note 'Mon analyse' vers le dossier 'Projets'",
    capabilities: ['note:move', 'note:delete', 'folder:create']
  },
  {
    message: "Supprimer la note 'Ancienne note'",
    capabilities: ['note:delete', 'note:update']
  },
  {
    message: "Créer un dossier 'Nouveau projet' dans le classeur 'Principal'",
    capabilities: ['folder:create', 'note:create']
  },
  {
    message: "Modifier le titre de la note 'Mon analyse'",
    capabilities: ['note:update', 'note:add-content']
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n📝 Test ${index + 1}: "${testCase.message}"`);
  console.log(`🎯 Capacités: ${testCase.capabilities.join(', ')}`);
  
  const intent = agentIntentParser.parseApiV2Intent(testCase.message, testCase.capabilities);
  
  if (intent) {
    console.log(`✅ Intention détectée: ${intent.action}`);
    console.log(`📊 Confiance: ${(intent.confidence * 100).toFixed(1)}%`);
    console.log(`📦 Données extraites:`, intent.extractedData);
    
    const request = agentIntentParser.buildApiV2Request(intent);
    if (request) {
      console.log(`🌐 Requête API: ${request.method} ${request.endpoint}`);
      console.log(`📤 Données:`, request.data);
    }
  } else {
    console.log(`❌ Aucune intention détectée`);
  }
});

console.log('\n🎯 Capacités disponibles:');
console.log(agentIntentParser.getAvailableCapabilities()); 