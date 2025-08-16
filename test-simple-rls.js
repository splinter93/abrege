#!/usr/bin/env node

/**
 * Test simple des permissions RLS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

console.log('🔍 Test simple des permissions RLS');
console.log('==================================');

async function testSimpleRLS() {
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Test de lecture anonyme
    console.log('\n1️⃣ Test de lecture anonyme...');
    const { data: readData, error: readError } = await anonClient
      .from('articles')
      .select('id, source_title, visibility, ispublished')
      .limit(3);
    
    if (readError) {
      console.log('❌ Erreur lecture:', readError.message);
    } else {
      console.log('✅ Lecture réussie:', readData?.length || 0, 'articles');
      readData?.forEach(article => {
        console.log(`   - ${article.source_title} (${article.visibility}, published: ${article.ispublished})`);
      });
    }

    // 2. Test de lecture avec filtre public
    console.log('\n2️⃣ Test de lecture articles publics...');
    const { data: publicData, error: publicError } = await anonClient
      .from('articles')
      .select('id, source_title, visibility, ispublished')
      .eq('visibility', 'public')
      .limit(5);
    
    if (publicError) {
      console.log('❌ Erreur lecture publics:', publicError.message);
    } else {
      console.log('✅ Articles publics trouvés:', publicData?.length || 0);
      publicData?.forEach(article => {
        console.log(`   - ${article.source_title}`);
      });
    }

    // 3. Test de lecture avec filtre ispublished
    console.log('\n3️⃣ Test de lecture articles ispublished...');
    const { data: publishedData, error: publishedError } = await anonClient
      .from('articles')
      .select('id, source_title, visibility, ispublished')
      .eq('ispublished', true)
      .limit(5);
    
    if (publishedError) {
      console.log('❌ Erreur lecture publiés:', publishedError.message);
    } else {
      console.log('✅ Articles publiés trouvés:', publishedData?.length || 0);
      publishedData?.forEach(article => {
        console.log(`   - ${article.source_title} (visibility: ${article.visibility})`);
      });
    }

    // 4. Test de création (doit échouer)
    console.log('\n4️⃣ Test de création anonyme (doit échouer)...');
    const { data: createData, error: createError } = await anonClient
      .from('articles')
      .insert({
        source_title: 'Test RLS 2',
        markdown_content: 'Test content',
        visibility: 'private'
      })
      .select();
    
    if (createError) {
      console.log('✅ Création échouée (normal):', createError.message);
    } else {
      console.log('❌ PROBLÈME: Création réussie!');
      console.log('   Article créé:', createData);
      
      // Nettoyer
      const { error: deleteError } = await anonClient
        .from('articles')
        .delete()
        .eq('source_title', 'Test RLS 2');
      
      if (deleteError) {
        console.log('❌ Erreur nettoyage:', deleteError.message);
      } else {
        console.log('✅ Article de test supprimé');
      }
    }

    // 5. Vérifier la cohérence des colonnes
    console.log('\n5️⃣ Vérification cohérence colonnes...');
    const { data: allData, error: allError } = await anonClient
      .from('articles')
      .select('visibility, ispublished')
      .limit(100);
    
    if (allError) {
      console.log('❌ Erreur lecture tous:', allError.message);
    } else {
      const stats = allData?.reduce((acc, article) => {
        acc.visibility[article.visibility] = (acc.visibility[article.visibility] || 0) + 1;
        acc.ispublished[article.ispublished ? 'true' : 'false'] = (acc.ispublished[article.ispublished ? 'true' : 'false'] || 0) + 1;
        return acc;
      }, { visibility: {}, ispublished: {} });
      
      console.log('📊 Statistiques:');
      console.log('   - visibility:', stats?.visibility);
      console.log('   - ispublished:', stats?.ispublished);
      
      // Vérifier la cohérence
      const inconsistent = allData?.filter(article => 
        (article.visibility === 'public' && !article.ispublished) ||
        (article.visibility === 'private' && article.ispublished)
      );
      
      if (inconsistent && inconsistent.length > 0) {
        console.log('⚠️  Articles incohérents:', inconsistent.length);
        inconsistent.slice(0, 5).forEach(article => {
          console.log(`     - visibility: ${article.visibility}, ispublished: ${article.ispublished}`);
        });
      } else {
        console.log('✅ Cohérence des colonnes OK');
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testSimpleRLS().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 