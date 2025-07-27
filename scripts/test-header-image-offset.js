// Script de test pour la fonctionnalité header_image_offset
// Usage: node scripts/test-header-image-offset.js

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://hddhjwlaampspoqncubs.supabase.co';
const API_BASE = 'http://localhost:3003/api/v1';

async function testHeaderImageOffset() {
  console.log('🧪 Test de la fonctionnalité header_image_offset\n');

  try {
    // 1. Créer une note avec header_image_offset
    console.log('1️⃣ Création d\'une note avec header_image_offset...');
    const createResponse = await fetch(`${API_BASE}/note/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_title: 'Test Header Image Offset',
        markdown_content: '# Test\n\nContenu de test',
        header_image: 'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop',
        header_image_offset: 75, // Position à 75%
        notebook_id: 'ai' // Utiliser un notebook existant
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Erreur création: ${error}`);
    }

    const { note } = await createResponse.json();
    console.log(`✅ Note créée avec ID: ${note.id}`);
    console.log(`📊 header_image_offset: ${note.header_image_offset}`);

    // 2. Mettre à jour l'offset
    console.log('\n2️⃣ Mise à jour de l\'offset...');
    const updateResponse = await fetch(`${API_BASE}/note/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        header_image_offset: 25 // Nouvelle position à 25%
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Erreur mise à jour: ${error}`);
    }

    const { note: updatedNote } = await updateResponse.json();
    console.log(`✅ Offset mis à jour: ${updatedNote.header_image_offset}`);

    // 3. Vérifier via l'endpoint information
    console.log('\n3️⃣ Vérification via endpoint information...');
    const infoResponse = await fetch(`${API_BASE}/note/${note.id}/information`);
    
    if (!infoResponse.ok) {
      const error = await infoResponse.text();
      throw new Error(`Erreur information: ${error}`);
    }

    const { note: infoNote } = await infoResponse.json();
    console.log(`✅ Information récupérée: header_image_offset = ${infoNote.header_image_offset}`);

    // 4. Test avec l'endpoint PATCH information
    console.log('\n4️⃣ Test avec PATCH information...');
    const patchResponse = await fetch(`${API_BASE}/note/${note.id}/information`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        header_image_offset: 80
      })
    });

    if (!patchResponse.ok) {
      const error = await patchResponse.text();
      throw new Error(`Erreur PATCH: ${error}`);
    }

    const { note: patchedNote } = await patchResponse.json();
    console.log(`✅ PATCH réussi: header_image_offset = ${patchedNote.header_image_offset}`);

    console.log('\n🎉 Tous les tests sont passés !');
    console.log(`📝 Note ID: ${note.id}`);
    console.log(`🔗 URL: http://localhost:3003/note/${note.id}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
testHeaderImageOffset(); 