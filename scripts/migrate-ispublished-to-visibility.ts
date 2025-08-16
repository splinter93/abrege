#!/usr/bin/env node

/**
 * Script de migration : ispublished → système de visibilité
 * 
 * Ce script :
 * 1. Met à jour les notes avec ispublished = true → visibility = 'public'
 * 2. Met à jour les notes avec ispublished = false → visibility = 'private'
 * 3. Supprime la colonne ispublished (optionnel)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateIspublishedToVisibility() {
  console.log('🔄 Migration ispublished → système de visibilité...\n');

  try {
    // 1. Analyser l'état actuel
    console.log('📊 1. Analyse de l\'état actuel...');
    
    const { data: stats, error: statsError } = await supabase
      .from('articles')
      .select('ispublished, visibility')
      .not('ispublished', 'is', null);

    if (statsError) {
      throw new Error(`Erreur récupération stats: ${statsError.message}`);
    }

    if (!stats || stats.length === 0) {
      console.log('✅ Aucune note avec ispublished trouvée');
      return;
    }

    const statsMap = stats.reduce((acc, article) => {
      const key = `ispublished_${article.ispublished}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Statistiques actuelles:');
    console.log(`   - Notes avec ispublished = true: ${statsMap.ispublished_true || 0}`);
    console.log(`   - Notes avec ispublished = false: ${statsMap.ispublished_false || 0}`);
    console.log(`   - Total: ${stats.length}\n`);

    // 2. Migration des notes ispublished = true → visibility = 'public'
    console.log('🔄 2. Migration ispublished = true → visibility = public...');
    
    const { data: publishedNotes, error: publishedError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility')
      .eq('ispublished', true);

    if (publishedError) {
      throw new Error(`Erreur récupération notes publiées: ${publishedError.message}`);
    }

    if (publishedNotes && publishedNotes.length > 0) {
      console.log(`📝 ${publishedNotes.length} notes à migrer vers 'public'`);
      
      let migratedCount = 0;
      for (const note of publishedNotes) {
        try {
          const { error: updateError } = await supabase
            .from('articles')
            .update({
              visibility: 'public',
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id);

          if (updateError) {
            console.error(`   ❌ Erreur migration note ${note.id}:`, updateError.message);
          } else {
            console.log(`   ✅ Note "${note.source_title}" migrée vers 'public'`);
            migratedCount++;
          }
        } catch (error: any) {
          console.error(`   ❌ Erreur migration note ${note.id}:`, error.message);
        }
      }
      
      console.log(`   🎯 ${migratedCount}/${publishedNotes.length} notes migrées vers 'public'\n`);
    }

    // 3. Migration des notes ispublished = false → visibility = 'private'
    console.log('🔄 3. Migration ispublished = false → visibility = private...');
    
    const { data: privateNotes, error: privateError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility')
      .eq('ispublished', false);

    if (privateError) {
      throw new Error(`Erreur récupération notes privées: ${privateError.message}`);
    }

    if (privateNotes && privateNotes.length > 0) {
      console.log(`📝 ${privateNotes.length} notes à migrer vers 'private'`);
      
      let migratedCount = 0;
      for (const note of privateNotes) {
        try {
          const { error: updateError } = await supabase
            .from('articles')
            .update({
              visibility: 'private',
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id);

          if (updateError) {
            console.error(`   ❌ Erreur migration note ${note.id}:`, updateError.message);
          } else {
            console.log(`   ✅ Note "${note.source_title}" migrée vers 'private'`);
            migratedCount++;
          }
        } catch (error: any) {
          console.error(`   ❌ Erreur migration note ${note.id}:`, error.message);
        }
      }
      
      console.log(`   🎯 ${migratedCount}/${privateNotes.length} notes migrées vers 'private'\n`);
    }

    // 4. Vérification finale
    console.log('🔍 4. Vérification finale...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility')
      .limit(10);

    if (finalError) {
      throw new Error(`Erreur vérification finale: ${finalError.message}`);
    }

    if (finalCheck) {
      console.log('📊 Échantillon après migration:');
      finalCheck.forEach(note => {
        const status = note.visibility === 'public' ? '✅' : '🔒';
        console.log(`   ${status} ${note.source_title}: visibility=${note.visibility}, ispublished=${note.ispublished}`);
      });
    }

    // 5. Recommandations
    console.log('\n📋 RECOMMANDATIONS:');
    console.log('   1. ✅ Migration terminée avec succès');
    console.log('   2. 🔄 Mettre à jour le code pour utiliser visibility au lieu de ispublished');
    console.log('   3. 🗑️  Supprimer la colonne ispublished après validation complète');
    console.log('   4. 🧪 Tester toutes les fonctionnalités avant suppression');

  } catch (error: any) {
    console.error('💥 Erreur fatale lors de la migration:', error.message);
    throw error;
  }
}

// Exécuter la migration
migrateIspublishedToVisibility()
  .then(() => {
    console.log('\n🎉 Migration terminée avec succès !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de la migration:', err);
    process.exit(1);
  }); 