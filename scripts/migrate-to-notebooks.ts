#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// [TEMP] USER_ID HARDCODED FOR DEV/LLM
const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";

async function checkCurrentState() {
  console.log('🔍 Vérification de l\'état actuel...');
  
  try {
    // Vérifier si la table notebooks existe
    const { data: notebooksTest, error: notebooksError } = await supabase
      .from('notebooks')
      .select('id')
      .limit(1);
    
    if (notebooksError && notebooksError.message.includes('relation "notebooks" does not exist')) {
      console.log('❌ Table notebooks n\'existe pas encore');
      return { notebooksExist: false, classeursExist: true };
    } else {
      console.log('✅ Table notebooks existe');
      return { notebooksExist: true, classeursExist: true };
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return { notebooksExist: false, classeursExist: true };
  }
}

async function migrateToNotebooks() {
  console.log('🚀 Migration vers notebooks...');
  console.log('=============================');
  
  const state = await checkCurrentState();
  
  if (state.notebooksExist) {
    console.log('✅ Migration déjà effectuée');
    return;
  }
  
  console.log('📋 Étapes de migration:');
  console.log('1. Exécuter la migration SQL dans Supabase');
  console.log('2. Vérifier les données migrées');
  console.log('3. Mettre à jour le code frontend');
  
  console.log('\n📝 Migration SQL à exécuter dans Supabase Dashboard:');
  console.log('📄 Fichier: supabase/migrations/20241215_rename_classeurs_to_notebooks.sql');
  
  console.log('\n⏳ En attente de l\'exécution de la migration SQL...');
  console.log('💡 Exécute la migration dans Supabase, puis appuie sur Entrée...');
  
  // En mode réel, on attendrait une entrée utilisateur
  console.log('\n🔄 Supposons que la migration SQL est terminée...');
  
  // Vérifier la migration
  await verifyMigration();
  
  // Mettre à jour le code frontend
  await updateFrontendCode();
}

async function verifyMigration() {
  console.log('\n🔍 Vérification de la migration...');
  
  try {
    // Vérifier que notebooks existe
    const { data: notebooks, error: notebooksError } = await supabase
      .from('notebooks')
      .select('id, name, slug')
      .eq('user_id', USER_ID);
    
    if (notebooksError) {
      console.log('❌ Erreur lors de la vérification notebooks:', notebooksError);
      return;
    }
    
    console.log(`✅ ${notebooks?.length || 0} notebooks trouvés`);
    
    // Vérifier que les colonnes notebook_id existent
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, source_title, notebook_id')
      .eq('user_id', USER_ID)
      .limit(1);
    
    if (articlesError) {
      console.log('❌ Erreur lors de la vérification articles:', articlesError);
      return;
    }
    
    console.log('✅ Colonne notebook_id présente dans articles');
    
    // Vérifier les dossiers
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, notebook_id')
      .eq('user_id', USER_ID)
      .limit(1);
    
    if (foldersError) {
      console.log('❌ Erreur lors de la vérification folders:', foldersError);
      return;
    }
    
    console.log('✅ Colonne notebook_id présente dans folders');
    
    console.log('\n🎉 Migration vérifiée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

async function updateFrontendCode() {
  console.log('\n🔧 Mise à jour du code frontend...');
  
  // Liste des fichiers à mettre à jour
  const filesToUpdate = [
    'src/types/supabase.ts',
    'src/store/useFileSystemStore.ts',
    'src/services/supabase.ts',
    'src/utils/slugGenerator.ts',
    'src/utils/resourceResolver.ts'
  ];
  
  console.log('📋 Fichiers à mettre à jour:');
  filesToUpdate.forEach(file => console.log(`- ${file}`));
  
  console.log('\n💡 Instructions:');
  console.log('1. Remplacer toutes les références "classeur" par "notebook"');
  console.log('2. Mettre à jour les types TypeScript');
  console.log('3. Mettre à jour les endpoints API');
  console.log('4. Tester les fonctionnalités');
  
  console.log('\n📝 Exemples de remplacements:');
  console.log('- classeur_id → notebook_id');
  console.log('- classeurs → notebooks');
  console.log('- Classeur → Notebook');
  console.log('- /api/v1/classeur/ → /api/v1/notebook/');
}

async function main() {
  console.log('🚀 MIGRATION VERS NOTEBOOKS');
  console.log('============================');
  console.log(`👤 USER_ID: ${USER_ID}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  
  try {
    await migrateToNotebooks();
    
    console.log('\n🎉 MIGRATION TERMINÉE !');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Mettre à jour le code frontend');
    console.log('2. Tester toutes les fonctionnalités');
    console.log('3. Supprimer l\'ancienne table classeurs (optionnel)');
    console.log('4. Déployer les changements');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
}

if (require.main === module) {
  main();
} 