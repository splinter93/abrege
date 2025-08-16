#!/usr/bin/env node

/**
 * Test du nouveau système de partage Google Drive
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

console.log('🚀 Test du nouveau système de partage Google Drive');
console.log('==================================================');

async function testNewSharingSystem() {
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Vérifier la structure de la base de données
    console.log('\n1️⃣ Vérification de la structure...');
    const { data: columns, error: columnsError } = await anonClient
      .from('articles')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.log('❌ Erreur lecture structure:', columnsError.message);
      return;
    }
    
    if (columns && columns.length > 0) {
      const article = columns[0];
      console.log('✅ Colonnes disponibles:', Object.keys(article));
      console.log('   - share_settings:', article.share_settings);
      console.log('   - visibility (legacy):', article.visibility);
      console.log('   - ispublished (legacy):', article.ispublished);
      console.log('   - public_url:', article.public_url);
    }

    // 2. Vérifier les données migrées
    console.log('\n2️⃣ Vérification des données migrées...');
    const { data: migratedData, error: migratedError } = await anonClient
      .from('articles')
      .select('id, source_title, share_settings, visibility, ispublished, public_url')
      .limit(10);
    
    if (migratedError) {
      console.log('❌ Erreur lecture données migrées:', migratedError.message);
    } else {
      console.log('✅ Articles migrés:', migratedData?.length || 0);
      
      migratedData?.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.source_title}`);
        console.log(`      - share_settings:`, article.share_settings);
        console.log(`      - legacy visibility: ${article.visibility}`);
        console.log(`      - legacy ispublished: ${article.ispublished}`);
        console.log(`      - public_url: ${article.public_url}`);
        console.log('');
      });
    }

    // 3. Vérifier la cohérence des données
    console.log('\n3️⃣ Vérification de la cohérence...');
    const { data: allData, error: allError } = await anonClient
      .from('articles')
      .select('share_settings, visibility, ispublished')
      .limit(100);
    
    if (allError) {
      console.log('❌ Erreur lecture tous:', allError.message);
    } else {
      const stats = allData?.reduce((acc, article) => {
        // Nouveau système
        const newVisibility = article.share_settings?.visibility || 'unknown';
        acc.newSystem[newVisibility] = (acc.newSystem[newVisibility] || 0) + 1;
        
        // Ancien système
        acc.oldSystem.visibility[article.visibility || 'unknown'] = (acc.oldSystem.visibility[article.visibility || 'unknown'] || 0) + 1;
        acc.oldSystem.ispublished[article.ispublished ? 'true' : 'false'] = (acc.oldSystem.ispublished[article.ispublished ? 'true' : 'false'] || 0) + 1;
        
        return acc;
      }, { 
        newSystem: {}, 
        oldSystem: { visibility: {}, ispublished: {} } 
      });
      
      console.log('📊 Statistiques nouveau système:');
      console.log('   - share_settings:', stats?.newSystem);
      console.log('📊 Statistiques ancien système:');
      console.log('   - visibility:', stats?.oldSystem.visibility);
      console.log('   - ispublished:', stats?.oldSystem.ispublished);
      
      // Vérifier la cohérence
      const inconsistent = allData?.filter(article => {
        const newVis = article.share_settings?.visibility;
        const oldVis = article.visibility;
        const oldPub = article.ispublished;
        
        // Vérifier si la migration est cohérente
        if (newVis === 'link' && !oldPub) return true; // Incohérent
        if (newVis === 'private' && oldPub) return true; // Incohérent
        
        return false;
      });
      
      if (inconsistent && inconsistent.length > 0) {
        console.log('⚠️  Articles incohérents:', inconsistent.length);
        inconsistent.slice(0, 5).forEach(article => {
          console.log(`     - share_settings: ${article.share_settings?.visibility}, ispublished: ${article.ispublished}`);
        });
      } else {
        console.log('✅ Cohérence des données OK');
      }
    }

    // 4. Test des politiques RLS
    console.log('\n4️⃣ Test des politiques RLS...');
    
    // Test de lecture anonyme (doit échouer pour les articles privés)
    const { data: privateRead, error: privateReadError } = await anonClient
      .from('articles')
      .select('id, source_title, share_settings')
      .eq('share_settings->>visibility', 'private')
      .limit(3);
    
    if (privateReadError) {
      console.log('✅ Lecture articles privés échouée (normal):', privateReadError.message);
    } else {
      console.log('❌ PROBLÈME: Lecture articles privés réussie!');
      console.log('   Articles lus:', privateRead?.length || 0);
    }
    
    // Test de lecture articles publics (doit réussir)
    const { data: publicRead, error: publicReadError } = await anonClient
      .from('articles')
      .select('id, source_title, share_settings')
      .eq('share_settings->>visibility', 'link')
      .limit(3);
    
    if (publicReadError) {
      console.log('❌ Erreur lecture articles publics:', publicReadError.message);
    } else {
      console.log('✅ Lecture articles publics réussie:', publicRead?.length || 0);
    }

    // 5. Test de création (doit échouer pour anonyme)
    console.log('\n5️⃣ Test de création anonyme (doit échouer)...');
    const { data: createData, error: createError } = await anonClient
      .from('articles')
      .insert({
        source_title: 'Test Nouveau Système',
        markdown_content: 'Test content',
        share_settings: {
          visibility: 'private',
          invited_users: [],
          allow_edit: false
        }
      })
      .select();
    
    if (createError) {
      console.log('✅ Création anonyme échouée (normal):', createError.message);
    } else {
      console.log('❌ PROBLÈME: Création anonyme réussie!');
      console.log('   Article créé:', createData);
      
      // Nettoyer
      const { error: deleteError } = await anonClient
        .from('articles')
        .delete()
        .eq('source_title', 'Test Nouveau Système');
      
      if (deleteError) {
        console.log('❌ Erreur nettoyage:', deleteError.message);
      } else {
        console.log('✅ Article de test supprimé');
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testNewSharingSystem().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 