#!/usr/bin/env node

/**
 * Script de correction de l'incohérence notebook_id vs classeur_id
 * Synchronise les deux colonnes pour assurer la cohérence des données
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  process.exit(1);
}

// Utiliser la clé service pour contourner RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNotebookClasseurInconsistency() {
  console.log('🔧 Correction de l\'incohérence notebook_id vs classeur_id...\n');

  try {
    // 1. Vérifier la structure actuelle
    console.log('📊 1. Vérification de la structure...');
    
    // Vérifier si notebook_id existe dans articles
    const { data: articlesStructure, error: articlesStructureError } = await supabase
      .from('articles')
      .select('classeur_id, notebook_id')
      .limit(1);

    if (articlesStructureError) {
      console.error('❌ Erreur vérification structure articles:', articlesStructureError.message);
      return;
    }

    console.log('✅ Structure articles vérifiée');

    // Vérifier si notebook_id existe dans folders
    const { data: foldersStructure, error: foldersStructureError } = await supabase
      .from('folders')
      .select('classeur_id, notebook_id')
      .limit(1);

    if (foldersStructureError) {
      console.error('❌ Erreur vérification structure folders:', foldersStructureError.message);
      return;
    }

    console.log('✅ Structure folders vérifiée');

    // 2. Synchroniser notebook_id avec classeur_id pour les articles
    console.log('\n📝 2. Synchronisation des articles...');
    
    const { data: articlesToUpdate, error: articlesSelectError } = await supabase
      .from('articles')
      .select('id, classeur_id, notebook_id')
      .or('classeur_id.is.not.null,notebook_id.is.not.null');

    if (articlesSelectError) {
      console.error('❌ Erreur sélection articles:', articlesSelectError.message);
      return;
    }

    console.log(`📊 ${articlesToUpdate?.length || 0} articles à traiter`);

    let articlesUpdated = 0;
    let articlesErrors = 0;

    for (const article of articlesToUpdate || []) {
      try {
        let updateData = {};
        
        // Si classeur_id existe mais pas notebook_id
        if (article.classeur_id && !article.notebook_id) {
          updateData.notebook_id = article.classeur_id;
        }
        // Si notebook_id existe mais pas classeur_id
        else if (article.notebook_id && !article.classeur_id) {
          updateData.classeur_id = article.notebook_id;
        }
        // Si les deux existent mais sont différents
        else if (article.classeur_id && article.notebook_id && article.classeur_id !== article.notebook_id) {
          updateData.notebook_id = article.classeur_id;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('articles')
            .update(updateData)
            .eq('id', article.id);

          if (updateError) {
            console.error(`❌ Erreur mise à jour article ${article.id}:`, updateError.message);
            articlesErrors++;
          } else {
            articlesUpdated++;
          }
        }
      } catch (error) {
        console.error(`❌ Erreur traitement article ${article.id}:`, error.message);
        articlesErrors++;
      }
    }

    console.log(`✅ Articles mis à jour: ${articlesUpdated}`);
    if (articlesErrors > 0) {
      console.log(`⚠️ Erreurs articles: ${articlesErrors}`);
    }

    // 3. Synchroniser notebook_id avec classeur_id pour les folders
    console.log('\n📁 3. Synchronisation des folders...');
    
    const { data: foldersToUpdate, error: foldersSelectError } = await supabase
      .from('folders')
      .select('id, classeur_id, notebook_id')
      .or('classeur_id.is.not.null,notebook_id.is.not.null');

    if (foldersSelectError) {
      console.error('❌ Erreur sélection folders:', foldersSelectError.message);
      return;
    }

    console.log(`📊 ${foldersToUpdate?.length || 0} folders à traiter`);

    let foldersUpdated = 0;
    let foldersErrors = 0;

    for (const folder of foldersToUpdate || []) {
      try {
        let updateData = {};
        
        // Si classeur_id existe mais pas notebook_id
        if (folder.classeur_id && !folder.notebook_id) {
          updateData.notebook_id = folder.classeur_id;
        }
        // Si notebook_id existe mais pas classeur_id
        else if (folder.notebook_id && !folder.classeur_id) {
          updateData.classeur_id = folder.notebook_id;
        }
        // Si les deux existent mais sont différents
        else if (folder.classeur_id && folder.notebook_id && folder.classeur_id !== folder.notebook_id) {
          updateData.notebook_id = folder.classeur_id;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('folders')
            .update(updateData)
            .eq('id', folder.id);

          if (updateError) {
            console.error(`❌ Erreur mise à jour folder ${folder.id}:`, updateError.message);
            foldersErrors++;
          } else {
            foldersUpdated++;
          }
        }
      } catch (error) {
        console.error(`❌ Erreur traitement folder ${folder.id}:`, error.message);
        foldersErrors++;
      }
    }

    console.log(`✅ Folders mis à jour: ${foldersUpdated}`);
    if (foldersErrors > 0) {
      console.log(`⚠️ Erreurs folders: ${foldersErrors}`);
    }

    // 4. Vérification finale
    console.log('\n🔍 4. Vérification finale...');
    
    // Compter les articles avec des incohérences
    const { data: inconsistentArticles, error: articlesCheckError } = await supabase
      .from('articles')
      .select('id')
      .or('classeur_id.is.null,notebook_id.is.null')
      .or('classeur_id.neq.notebook_id');

    if (articlesCheckError) {
      console.error('❌ Erreur vérification articles:', articlesCheckError.message);
    } else {
      console.log(`📝 Articles incohérents restants: ${inconsistentArticles?.length || 0}`);
    }

    // Compter les folders avec des incohérences
    const { data: inconsistentFolders, error: foldersCheckError } = await supabase
      .from('folders')
      .select('id')
      .or('classeur_id.is.null,notebook_id.is.null')
      .or('classeur_id.neq.notebook_id');

    if (foldersCheckError) {
      console.error('❌ Erreur vérification folders:', foldersCheckError.message);
    } else {
      console.log(`📁 Folders incohérents restants: ${inconsistentFolders?.length || 0}`);
    }

    // 5. Résumé
    console.log('\n📋 5. Résumé de la correction...');
    console.log(`✅ Articles synchronisés: ${articlesUpdated}`);
    console.log(`✅ Folders synchronisés: ${foldersUpdated}`);
    console.log(`⚠️ Erreurs totales: ${articlesErrors + foldersErrors}`);
    
    if ((articlesErrors + foldersErrors) === 0) {
      console.log('\n🎉 Correction terminée avec succès !');
      console.log('Les contenus des classeurs devraient maintenant s\'afficher correctement.');
    } else {
      console.log('\n⚠️ Correction terminée avec des erreurs.');
      console.log('Vérifiez les logs ci-dessus pour plus de détails.');
    }

  } catch (error) {
    console.error('❌ Erreur fatale lors de la correction:', error);
    process.exit(1);
  }
}

// Exécuter la correction
fixNotebookClasseurInconsistency()
  .then(() => {
    console.log('\n✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  }); 