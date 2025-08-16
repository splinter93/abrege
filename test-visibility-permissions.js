#!/usr/bin/env node

/**
 * Test du système de permissions avec visibility
 * Vérifie si les politiques RLS fonctionnent correctement
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

console.log('🔍 Test du système de permissions avec visibility');
console.log('================================================');

async function testVisibilityPermissions() {
  try {
    // 1. Test avec client anonyme
    console.log('\n1️⃣ Test avec client anonyme...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: anonArticles, error: anonError } = await anonClient
      .from('articles')
      .select('id, source_title, visibility, user_id')
      .limit(5);
    
    if (anonError) {
      console.log('❌ Erreur client anonyme:', anonError.message);
    } else {
      console.log('✅ Client anonyme peut lire:', anonArticles?.length || 0, 'articles');
      console.log('   Articles visibles:', anonArticles?.filter(a => a.visibility === 'public').length || 0);
    }

    // 2. Vérifier la structure de la base de données
    console.log('\n2️⃣ Vérification de la structure...');
    const { data: columns, error: columnsError } = await anonClient
      .from('articles')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.log('❌ Erreur lecture structure:', columnsError.message);
    } else if (columns && columns.length > 0) {
      const article = columns[0];
      console.log('✅ Colonnes disponibles:', Object.keys(article));
      console.log('   - visibility:', article.visibility);
      console.log('   - ispublished:', article.ispublished);
      console.log('   - user_id:', article.user_id);
    }

    // 3. Test des politiques RLS
    console.log('\n3️⃣ Test des politiques RLS...');
    const { data: policies, error: policiesError } = await anonClient
      .rpc('get_policies', { table_name: 'articles' });
    
    if (policiesError) {
      console.log('❌ Erreur lecture politiques:', policiesError.message);
      console.log('   (Fonction get_policies peut ne pas exister)');
    } else {
      console.log('✅ Politiques RLS:', policies);
    }

    // 4. Vérifier les articles publics vs privés
    console.log('\n4️⃣ Analyse des articles publics/privés...');
    const { data: visibilityStats, error: statsError } = await anonClient
      .from('articles')
      .select('visibility, ispublished')
      .limit(100);
    
    if (statsError) {
      console.log('❌ Erreur statistiques:', statsError.message);
    } else {
      const stats = visibilityStats?.reduce((acc, article) => {
        acc.visibility[article.visibility] = (acc.visibility[article.visibility] || 0) + 1;
        acc.ispublished[article.ispublished ? 'true' : 'false'] = (acc.ispublished[article.ispublished ? 'true' : 'false'] || 0) + 1;
        return acc;
      }, { visibility: {}, ispublished: {} });
      
      console.log('✅ Statistiques visibility:', stats?.visibility);
      console.log('✅ Statistiques ispublished:', stats?.ispublished);
    }

    // 5. Test de création d'article (doit échouer pour anonyme)
    console.log('\n5️⃣ Test création article anonyme (doit échouer)...');
    const { data: createData, error: createError } = await anonClient
      .from('articles')
      .insert({
        source_title: 'Test Article Anonyme',
        markdown_content: 'Test content',
        visibility: 'private'
      })
      .select();
    
    if (createError) {
      console.log('✅ Création échouée comme attendu:', createError.message);
    } else {
      console.log('❌ PROBLÈME: Création anonyme réussie!');
      console.log('   Article créé:', createData);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testVisibilityPermissions().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 