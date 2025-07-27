/**
 * Script de test pour vérifier la réinitialisation de l'offset lors du changement d'image d'en-tête
 * Usage: node scripts/test-header-image-reset.js
 */

const API_BASE = 'http://localhost:3003/api/v1';
const NOTE_ID = '24168cfd-af8f-4e41-b6e3-811bdaa8528a'; // Remplacer par un ID de note existant

async function testHeaderImageReset() {
  console.log('🧪 Test de réinitialisation de l\'offset lors du changement d\'image d\'en-tête\n');

  try {
    // 1. Vérifier l'état initial
    console.log('1️⃣ Vérification de l\'état initial...');
    const initialResponse = await fetch(`${API_BASE}/note/${NOTE_ID}`);
    const initialData = await initialResponse.json();
    
    if (!initialData.note) {
      throw new Error('Note non trouvée');
    }
    
    console.log(`   Offset initial: ${initialData.note.header_image_offset}`);
    console.log(`   Image actuelle: ${initialData.note.header_image || 'Aucune'}\n`);

    // 2. Changer l'image d'en-tête (avec réinitialisation de l'offset)
    console.log('2️⃣ Changement d\'image d\'en-tête...');
    const newImageUrl = 'https://picsum.photos/1200/400?random=' + Date.now();
    
    const updateResponse = await fetch(`${API_BASE}/note/${NOTE_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        header_image: newImageUrl,
        header_image_offset: 50.00
      })
    });
    
    const updateData = await updateResponse.json();
    
    if (!updateData.note) {
      throw new Error('Erreur lors de la mise à jour');
    }
    
    console.log(`   Nouvelle image: ${updateData.note.header_image}`);
    console.log(`   Offset après changement: ${updateData.note.header_image_offset}\n`);

    // 3. Vérifier que l'offset est bien à 50.00
    console.log('3️⃣ Vérification de la réinitialisation...');
    const finalResponse = await fetch(`${API_BASE}/note/${NOTE_ID}`);
    const finalData = await finalResponse.json();
    
    if (!finalData.note) {
      throw new Error('Note non trouvée après mise à jour');
    }
    
    console.log(`   Offset final: ${finalData.note.header_image_offset}`);
    
    // 4. Validation
    const isOffsetReset = finalData.note.header_image_offset === 50.00;
    const isImageChanged = finalData.note.header_image === newImageUrl;
    
    console.log('\n📊 Résultats:');
    console.log(`   ✅ Image changée: ${isImageChanged}`);
    console.log(`   ✅ Offset réinitialisé à 50.00: ${isOffsetReset}`);
    
    if (isOffsetReset && isImageChanged) {
      console.log('\n🎉 SUCCÈS: La réinitialisation de l\'offset fonctionne correctement !');
    } else {
      console.log('\n❌ ÉCHEC: La réinitialisation de l\'offset ne fonctionne pas.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testHeaderImageReset(); 