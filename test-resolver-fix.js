// Test de la correction du V2ResourceResolver
function cleanAndValidateId(id) {
  // ✅ 1. Nettoyer l'ID (remplacer les tirets longs par des tirets courts)
  const cleanId = id.replace(/‑/g, '-'); // Remplace les em-dash (‑) par des hyphens (-)
  
  // ✅ 2. Valider que c'est un UUID valide
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(cleanId)) {
    throw new Error(`ID invalide: ${id}`);
  }
  
  return cleanId;
}

console.log('🧪 Test de la correction du V2ResourceResolver...');

// Test avec un ID contenant des tirets longs
try {
  const longDashId = '0956ae90‑a9d2‑420f‑b5a0‑6df707784c88';
  console.log('ID avec tirets longs:', longDashId);
  
  const cleanedId = cleanAndValidateId(longDashId);
  console.log('✅ ID nettoyé:', cleanedId);
  
  // Vérifier que l'ID nettoyé est valide
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  console.log('✅ Regex UUID match:', uuidRegex.test(cleanedId));
  
} catch (error) {
  console.log('❌ Erreur:', error.message);
}

console.log('\n🏁 Test terminé'); 