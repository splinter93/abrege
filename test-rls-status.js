#!/usr/bin/env node

/**
 * Test du statut RLS sur la table articles
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

console.log('🔍 Test du statut RLS sur la table articles');
console.log('============================================');

async function testRLSStatus() {
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Vérifier si RLS est activé
    console.log('\n1️⃣ Vérification du statut RLS...');
    const { data: rlsStatus, error: rlsError } = await anonClient
      .rpc('get_table_rls_status', { table_name: 'articles' });
    
    if (rlsError) {
      console.log('❌ Erreur lecture statut RLS:', rlsError.message);
      console.log('   Tentative alternative...');
      
      // Alternative : essayer de lire les politiques directement
      const { data: policies, error: policiesError } = await anonClient
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'articles')
        .eq('schemaname', 'public');
      
      if (policiesError) {
        console.log('❌ Erreur lecture politiques pg_policies:', policiesError.message);
      } else {
        console.log('✅ Politiques trouvées:', policies?.length || 0);
        policies?.forEach(policy => {
          console.log(`   - ${policy.policyname}: ${policy.cmd} sur ${policy.qual}`);
        });
      }
    } else {
      console.log('✅ Statut RLS:', rlsStatus);
    }

    // 2. Test de lecture avec authentification
    console.log('\n2️⃣ Test de lecture authentifiée...');
    
    // Essayer de lire avec un token invalide
    const fakeClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: 'Bearer fake_token_123'
        }
      }
    });
    
    const { data: fakeAuthData, error: fakeAuthError } = await fakeClient
      .from('articles')
      .select('id, source_title, visibility')
      .limit(3);
    
    if (fakeAuthError) {
      console.log('✅ Lecture avec token invalide échouée (normal):', fakeAuthError.message);
    } else {
      console.log('❌ PROBLÈME: Lecture avec token invalide réussie!');
      console.log('   Données:', fakeAuthData);
    }

    // 3. Vérifier les contraintes de la table
    console.log('\n3️⃣ Vérification des contraintes...');
    const { data: constraints, error: constraintsError } = await anonClient
      .rpc('get_table_constraints', { table_name: 'articles' });
    
    if (constraintsError) {
      console.log('❌ Erreur lecture contraintes:', constraintsError.message);
    } else {
      console.log('✅ Contraintes de la table:', constraints);
    }

    // 4. Test de suppression de l'article de test
    console.log('\n4️⃣ Nettoyage de l\'article de test...');
    const { error: deleteError } = await anonClient
      .from('articles')
      .delete()
      .eq('source_title', 'Test Article Anonyme');
    
    if (deleteError) {
      console.log('❌ Erreur suppression article de test:', deleteError.message);
    } else {
      console.log('✅ Article de test supprimé');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testRLSStatus().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 