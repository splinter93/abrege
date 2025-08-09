#!/usr/bin/env node

/**
 * Script de test pour la validation et correction d'UUID
 * Teste la correction d'UUIDs mal formatés
 */

console.log('🔍 TEST UUID CORRECTION - VALIDATION');

// UUIDs de test
const testUuids = [
  // UUID valide
  'd35d755e-42a4-4100-b796-9c614b2b13bd',
  
  // UUID mal formaté (35 caractères au lieu de 36)
  '75b35cbc-9de3-40e-abb1-d4970b2a24a9',
  
  // UUID mal formaté (trop court)
  '75b35cbc-9de3-40e-abb1-d4970b2a24a',
  
  // UUID mal formaté (trop long)
  '75b35cbc-9de3-40e-abb1-d4970b2a24a99',
  
  // UUID mal formaté (mauvais séparateurs)
  '75b35cbc9de340eabb1d4970b2a24a9'
];

// Fonction de validation UUID
function isValidUuid(uuid) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

// Fonction de correction UUID
function correctUuid(uuid) {
  if (uuid.length === 35) {
    // UUID avec un caractère manquant dans la 3ème section
    const sections = uuid.split('-');
    if (sections.length === 5 && sections[2].length === 3) {
      // Ajouter un 0 à la 3ème section
      sections[2] = sections[2] + '0';
      const correctedUuid = sections.join('-');
      if (isValidUuid(correctedUuid)) {
        return correctedUuid;
      }
    }
  }
  return null;
}

console.log('\n📋 ANALYSE DES UUIDs:');

testUuids.forEach((uuid, index) => {
  console.log(`\n${index + 1}. UUID: ${uuid}`);
  console.log(`   Longueur: ${uuid.length} caractères`);
  console.log(`   Format valide: ${isValidUuid(uuid) ? '✅ OUI' : '❌ NON'}`);
  
  if (!isValidUuid(uuid)) {
    const corrected = correctUuid(uuid);
    if (corrected) {
      console.log(`   🔧 UUID corrigé: ${corrected}`);
      console.log(`   ✅ Correction valide: ${isValidUuid(corrected) ? 'OUI' : 'NON'}`);
    } else {
      console.log(`   ❌ Impossible de corriger cet UUID`);
    }
  }
});

// Test de la regex de correction
console.log('\n🧪 TEST REGEX DE CORRECTION:');

const malformedUuid = '75b35cbc-9de3-40e-abb1-d4970b2a24a9';
console.log(`UUID mal formaté: ${malformedUuid}`);

const correctedUuid = malformedUuid.replace(/(.{8}-.{4}-.{3})(.{1})(.{4}-.{12})/, '$10$3$4');
console.log(`UUID corrigé: ${correctedUuid}`);
console.log(`Validation: ${isValidUuid(correctedUuid) ? '✅ VALIDE' : '❌ INVALIDE'}`);

// Recommandations
console.log('\n💡 RECOMMANDATIONS:');
console.log('   1. Le LLM doit générer des UUIDs valides au format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
console.log('   2. Les UUIDs doivent avoir exactement 36 caractères');
console.log('   3. Les séparateurs doivent être des tirets (-)');
console.log('   4. Seuls les caractères hexadécimaux (0-9, a-f) sont autorisés');
console.log('   5. La correction automatique peut aider mais ne doit pas être la solution principale');

console.log('\n✅ TEST TERMINÉ - UUIDs analysés'); 