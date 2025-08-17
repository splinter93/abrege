#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPublicAccess() {
  try {
    console.log('🧪 TEST D\'ACCÈS PUBLIC AUX NOTES');
    console.log('==================================\n');
    
    // Test 1: Compter le total des articles (devrait fonctionner maintenant)
    console.log('📊 Test 1: Compter le total des articles...');
    try {
      const { count: totalArticles, error: totalError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) {
        console.log(`   ❌ Erreur: ${totalError.message}`);
      } else {
        console.log(`   ✅ Total articles: ${totalArticles || 0}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
    
    // Test 2: Récupérer les notes publiques
    console.log('\n🌐 Test 2: Récupérer les notes publiques...');
    try {
      const { data: publicNotes, error: publicError } = await supabase
        .from('articles')
        .select('id, slug, source_title, user_id, share_settings')
        .not('share_settings->>visibility', 'eq', 'private');
      
      if (publicError) {
        console.log(`   ❌ Erreur: ${publicError.message}`);
      } else {
        console.log(`   ✅ Notes publiques trouvées: ${publicNotes?.length || 0}`);
        if (publicNotes && publicNotes.length > 0) {
          publicNotes.forEach((note, index) => {
            console.log(`      ${index + 1}. "${note.source_title}" (${note.slug}) - Visibilité: ${note.share_settings?.visibility}`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
    
    // Test 3: Récupérer une note spécifique par slug
    console.log('\n🔍 Test 3: Récupérer une note par slug...');
    try {
      // D'abord, trouver une note avec un slug
      const { data: noteWithSlug, error: slugError } = await supabase
        .from('articles')
        .select('slug, user_id')
        .not('slug', 'is', null)
        .limit(1)
        .single();
      
      if (slugError || !noteWithSlug) {
        console.log('   ❌ Aucune note avec slug trouvée');
      } else {
        console.log(`   ✅ Note trouvée avec slug: ${noteWithSlug.slug}`);
        
        // Maintenant, récupérer l'utilisateur
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', noteWithSlug.user_id)
          .single();
        
        if (userError || !user) {
          console.log('   ❌ Utilisateur non trouvé');
        } else {
          console.log(`   ✅ Username: ${user.username}`);
          
          // Tester l'URL publique
          const publicUrl = `/${user.username}/${noteWithSlug.slug}`;
          console.log(`   ✅ URL publique: ${publicUrl}`);
          
          // Tester l'API publique
          console.log('\n🌐 Test 4: Test de l\'API publique...');
          try {
            const apiUrl = `${supabaseUrl.replace('/rest/v1', '')}/api/v1/public/note/${user.username}/${noteWithSlug.slug}`;
            console.log(`   🔗 Test de l'API: ${apiUrl}`);
            
            // Note: Ce test nécessiterait une requête HTTP réelle
            console.log('   💡 Pour tester l\'API complètement, utilisez un navigateur ou curl');
          } catch (error) {
            console.log(`   ❌ Erreur test API: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
    
    // Test 5: Vérifier la structure des données
    console.log('\n🏗️  Test 5: Vérifier la structure des données...');
    try {
      const { data: sampleNote, error: sampleError } = await supabase
        .from('articles')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleError) {
        console.log(`   ❌ Erreur: ${sampleError.message}`);
      } else if (sampleNote) {
        console.log('   ✅ Structure de la note:');
        console.log(`      - ID: ${sampleNote.id}`);
        console.log(`      - Titre: ${sampleNote.source_title}`);
        console.log(`      - Slug: ${sampleNote.slug || 'NULL'}`);
        console.log(`      - User ID: ${sampleNote.user_id}`);
        console.log(`      - Share Settings: ${JSON.stringify(sampleNote.share_settings)}`);
        console.log(`      - HTML Content: ${sampleNote.html_content ? `${sampleNote.html_content.substring(0, 50)}...` : 'NULL'}`);
        console.log(`      - Markdown Content: ${sampleNote.markdown_content ? `${sampleNote.markdown_content.substring(0, 50)}...` : 'NULL'}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
    
    console.log('\n📋 RÉSUMÉ DES TESTS');
    console.log('====================');
    console.log('✅ Tests terminés');
    console.log('💡 Vérifiez les résultats ci-dessus');
    
    if (process.argv.includes('--fix')) {
      console.log('\n🔧 Application de la correction RLS...');
      const { execSync } = require('child_process');
      try {
        execSync('node scripts/apply-public-access-fix.js', { stdio: 'inherit' });
      } catch (error) {
        console.log('❌ Erreur lors de l\'application de la correction');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests
testPublicAccess().catch(console.error); 