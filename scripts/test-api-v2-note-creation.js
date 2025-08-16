import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiV2NoteCreation() {
  console.log('🧪 Test de création de note via API V2 avec génération automatique de slug...\n');
  
  try {
    // 1. Récupérer un utilisateur de test (premier utilisateur trouvé)
    console.log('1️⃣ Récupération d\'un utilisateur de test...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ Aucun utilisateur trouvé:', userError);
      return;
    }
    
    const testUser = users[0];
    console.log(`✅ Utilisateur de test: ${testUser.username} (${testUser.id})`);
    
    // 2. Récupérer un classeur de test
    console.log('\n2️⃣ Récupération d\'un classeur de test...');
    const { data: classeurs, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name, slug')
      .eq('user_id', testUser.id)
      .limit(1);
    
    if (classeurError || !classeurs || classeurs.length === 0) {
      console.error('❌ Aucun classeur trouvé pour cet utilisateur:', classeurError);
      return;
    }
    
    const testClasseur = classeurs[0];
    console.log(`✅ Classeur de test: ${testClasseur.name} (${testClasseur.slug})`);
    
    // 3. Créer une note de test via l'API V2
    console.log('\n3️⃣ Création d\'une note de test via API V2...');
    const testTitle = `Note de test API V2 ${Date.now()}`;
    
    // Simuler un appel à l'API V2
    const noteData = {
      source_title: testTitle,
      markdown_content: 'Contenu de test pour vérifier la génération automatique de slug via API V2',
      notebook_id: testClasseur.slug, // Utiliser le slug du classeur
      folder_id: null
    };
    
    console.log('📤 Données envoyées à l\'API V2:', noteData);
    
    // Appeler l'API V2
    const response = await fetch(`${supabaseUrl.replace('/rest/v1/', '')}/api/v2/note/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}` // Note: ceci ne fonctionnera pas sans authentification réelle
      },
      body: JSON.stringify(noteData)
    });
    
    if (!response.ok) {
      console.error(`❌ Erreur API V2: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Détails de l\'erreur:', errorText);
      
      // Test alternatif: vérifier que la note existe déjà avec un slug
      console.log('\n🔍 Test alternatif: vérification des notes existantes...');
      const { data: existingNotes, error: listError } = await supabase
        .from('articles')
        .select('id, source_title, slug, public_url, created_at')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (listError) {
        console.error('❌ Erreur lors de la récupération des notes:', listError);
        return;
      }
      
      console.log(`📋 ${existingNotes.length} notes trouvées:`);
      existingNotes.forEach((note, index) => {
        const hasSlug = note.slug ? '✅' : '❌';
        const hasUrl = note.public_url ? '✅' : '❌';
        console.log(`${index + 1}. ${note.source_title}`);
        console.log(`   - Slug: ${hasSlug} ${note.slug || 'MANQUANT'}`);
        console.log(`   - URL: ${hasUrl} ${note.public_url || 'MANQUANT'}`);
        console.log(`   - Créée: ${new Date(note.created_at).toLocaleDateString()}`);
        console.log('');
      });
      
      return;
    }
    
    const result = await response.json();
    console.log('✅ Réponse API V2:', result);
    
    if (result.note) {
      const note = result.note;
      console.log(`\n✅ Note créée avec succès via API V2!`);
      console.log(`   - ID: ${note.id}`);
      console.log(`   - Titre: ${note.source_title}`);
      console.log(`   - Slug: ${note.slug || '❌ MANQUANT!'}`);
      console.log(`   - URL publique: ${note.public_url || '❌ MANQUANT!'}`);
      
      // Vérifier que le slug a été généré automatiquement
      if (!note.slug) {
        console.error('\n❌ PROBLÈME DÉTECTÉ: La note a été créée sans slug automatique!');
      } else {
        console.log('\n✅ SUCCÈS: La note a été créée avec un slug automatique!');
        console.log(`   - Slug: ${note.slug}`);
        console.log(`   - URL publique: ${note.public_url || 'Non disponible'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale lors du test:', error);
  }
}

// Exécuter le test
testApiV2NoteCreation().catch(console.error); 