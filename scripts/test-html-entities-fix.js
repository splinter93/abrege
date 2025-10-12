#!/usr/bin/env node
/**
 * Script de test pour valider le fix des entités HTML
 * 
 * @description Teste le cycle complet serveur ↔ client avec du contenu réel
 */

// Simulation des fonctions (copie du code pour test standalone)
function sanitizeMarkdownContent(content) {
  if (!content) return content;
  const hasRawHtml = /<[a-z][\s\S]*?>/i.test(content);
  if (!hasRawHtml) return content;
  
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function unescapeHtmlEntities(content) {
  if (!content) return content;
  const hasHtmlEntities = /&(?:lt|gt|amp|quot|#039);/i.test(content);
  if (!hasHtmlEntities) return content;
  
  return content
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function prepareMarkdownForEditor(content) {
  if (!content) return '';
  let cleaned = unescapeHtmlEntities(content);
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  if (cleaned && !cleaned.endsWith('\n')) {
    cleaned += '\n';
  }
  return cleaned;
}

// Contenu de la note problématique (extrait)
const problematicContent = `# 🎯 SYNTHÈSE : LE CHAT EST-IL TROP COMPLIQUÉ ?

**Date:** 11 octobre 2025  
**Verdict:** ⚠️ **MODÉRÉMENT COMPLEXE - SIMPLIFICATION RECOMMANDÉE**

## 📊 RÉPONSE DIRECTE

### OUI et NON

#### ✅ Ce qui est BON
- Architecture globale claire et bien pensée

#### ❌ Ce qui est TROP COMPLEXE
- **ChatFullscreenV2** : 775 lignes, 9 callbacks, logique répétitive

## Code Examples

\`\`\`typescript
const handleComplete = useCallback(() => {
  // Code avec <generics> et "quotes"
  return Array<string>;
});
\`\`\`

## Tableau

| Métrique | Actuel | Optimal |
|----------|--------|---------|
| Code | <775> | "200" |
| Gain | -74% | +100% |
`;

console.log('🧪 Test du fix des entités HTML\n');
console.log('═'.repeat(60));

// Test 1: Échappement serveur
console.log('\n1️⃣  ÉCHAPPEMENT SERVEUR (pour sauvegarde en DB)');
console.log('─'.repeat(60));
const escaped = sanitizeMarkdownContent(problematicContent);
console.log('✅ HTML échappé:', escaped.includes('&lt;') && escaped.includes('&gt;'));
console.log('   Extrait:', escaped.substring(0, 100) + '...');

// Test 2: Dé-échappement client
console.log('\n2️⃣  DÉ-ÉCHAPPEMENT CLIENT (pour chargement dans Tiptap)');
console.log('─'.repeat(60));
const unescaped = unescapeHtmlEntities(escaped);
console.log('✅ Entités dé-échappées:', !unescaped.includes('&lt;') && !unescaped.includes('&gt;'));
console.log('   Extrait:', unescaped.substring(0, 100) + '...');

// Test 3: Cycle complet
console.log('\n3️⃣  CYCLE COMPLET (pas de perte de données)');
console.log('─'.repeat(60));
const cycleComplete = unescaped === problematicContent;
console.log('✅ Contenu identique:', cycleComplete);
console.log('   Original length:', problematicContent.length);
console.log('   Final length:', unescaped.length);

// Test 4: prepareMarkdownForEditor
console.log('\n4️⃣  PRÉPARATION POUR ÉDITEUR');
console.log('─'.repeat(60));
const prepared = prepareMarkdownForEditor(escaped);
console.log('✅ Prêt pour Tiptap:', prepared.length > 0);
console.log('   Sauts de ligne normalisés:', !prepared.includes('\r\n'));
console.log('   Se termine par \\n:', prepared.endsWith('\n'));

// Test 5: Cas spécifiques
console.log('\n5️⃣  CAS SPÉCIFIQUES');
console.log('─'.repeat(60));

const testCases = [
  { name: 'Code avec <generics>', input: 'Array<string>', expected: true },
  { name: 'Guillemets doubles', input: '"quotes"', expected: true },
  { name: 'Guillemets simples', input: "'quotes'", expected: true },
  { name: 'Symbole &', input: 'A & B', expected: true },
  { name: 'Chevrons multiples', input: '<<< >>>', expected: true },
  { name: 'Arrow function =>', input: '() => {}', expected: true },
];

let allTestsPassed = true;
testCases.forEach((testCase, i) => {
  const escaped = sanitizeMarkdownContent(testCase.input);
  const unescaped = unescapeHtmlEntities(escaped);
  const pass = unescaped === testCase.input;
  console.log(`   ${i + 1}. ${testCase.name}: ${pass ? '✅' : '❌'}`);
  if (!pass) {
    console.log(`      Original:  "${testCase.input}"`);
    console.log(`      Escaped:   "${escaped}"`);
    console.log(`      Unescaped: "${unescaped}"`);
    allTestsPassed = false;
  }
});

// Résumé
console.log('\n' + '═'.repeat(60));
console.log('📊 RÉSUMÉ');
console.log('═'.repeat(60));

if (allTestsPassed && cycleComplete) {
  console.log('✅ TOUS LES TESTS PASSENT');
  console.log('🚀 Le fix est fonctionnel et prêt pour la production');
  console.log('\n📝 Actions suivantes:');
  console.log('   1. Tester dans l\'interface avec la note 34aa2ee2-c40e-48a3-8608-f86bc126ee0a');
  console.log('   2. Vérifier que l\'éditeur ne plante plus');
  console.log('   3. Déployer en production');
  process.exit(0);
} else {
  console.log('❌ CERTAINS TESTS ÉCHOUENT');
  console.log('⚠️  Vérifier les logs ci-dessus');
  process.exit(1);
}

