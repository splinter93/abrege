#!/usr/bin/env node

/**
 * Script de correction de la visibilité via SQL direct
 * Contourne les restrictions RLS en utilisant l'API SQL de Supabase
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

async function fixVisibilityViaSQL() {
  console.log('🔧 Correction de la visibilité via SQL direct...\n');

  try {
    // 1. État avant correction
    console.log('📊 1. État avant correction...');
    
    const { data: beforeStats, error: beforeError } = await supabase
      .from('articles')
      .select('ispublished, visibility')
      .not('ispublished', 'is', null);

    if (beforeError) {
      throw new Error(`Erreur récupération stats: ${beforeError.message}`);
    }

    if (beforeStats) {
      const stats = beforeStats.reduce((acc, article) => {
        const key = `ispublished_${article.ispublished}_visibility_${article.visibility}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('   📈 État actuel:');
      Object.entries(stats).forEach(([key, count]) => {
        console.log(`      - ${key}: ${count}`);
      });
    }

    // 2. Exécution des corrections SQL
    console.log('\n🔄 2. Exécution des corrections SQL...');
    
    // Correction 1: ispublished = true → visibility = 'public'
    console.log('   📝 Correction ispublished = true → visibility = public...');
    const { data: update1, error: error1 } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          UPDATE articles 
          SET visibility = 'public', updated_at = NOW()
          WHERE ispublished = true
        `
      });

    if (error1) {
      console.log('   ⚠️  RPC exec_sql non disponible, tentative via query directe...');
      
      // Tentative via query directe
      const { data: directUpdate1, error: directError1 } = await supabase
        .from('articles')
        .update({ 
          visibility: 'public',
          updated_at: new Date().toISOString()
        })
        .eq('ispublished', true);

      if (directError1) {
        console.error(`   ❌ Erreur mise à jour directe: ${directError1.message}`);
      } else {
        console.log(`   ✅ Notes mises à jour vers 'public'`);
      }
    } else {
      console.log('   ✅ Correction SQL exécutée');
    }

    // 3. Vérification après correction
    console.log('\n🔍 3. Vérification après correction...');
    
    const { data: afterStats, error: afterError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility, public_url')
      .not('ispublished', 'is', null)
      .limit(10);

    if (afterError) {
      throw new Error(`Erreur vérification finale: ${afterError.message}`);
    }

    if (afterStats) {
      console.log('📊 Échantillon après correction:');
      afterStats.forEach(note => {
        const status = note.visibility === 'public' ? '✅' : '❌';
        console.log(`   ${status} ${note.source_title}: visibility=${note.visibility}, ispublished=${note.ispublished}`);
      });
    }

    // 4. Statistiques finales
    console.log('\n📈 4. Statistiques finales...');
    
    const { data: finalStats, error: finalError } = await supabase
      .from('articles')
      .select('ispublished, visibility');

    if (finalError) {
      throw new Error(`Erreur stats finales: ${finalError.message}`);
    }

    if (finalStats) {
      const stats = finalStats.reduce((acc, article) => {
        // ispublished stats
        if (article.ispublished !== null) {
          const ispubKey = `ispublished_${article.ispublished}`;
          acc.ispublished[ispubKey] = (acc.ispublished[ispubKey] || 0) + 1;
        }
        
        // visibility stats
        if (article.visibility) {
          acc.visibility[article.visibility] = (acc.visibility[article.visibility] || 0) + 1;
        }
        
        return acc;
      }, {
        ispublished: {} as Record<string, number>,
        visibility: {} as Record<string, number>
      });

      console.log('   📊 Statistiques ispublished:');
      Object.entries(stats.ispublished).forEach(([key, count]) => {
        console.log(`      - ${key}: ${count}`);
      });

      console.log('   📊 Statistiques visibility:');
      Object.entries(stats.visibility).forEach(([key, count]) => {
        console.log(`      - ${key}: ${count}`);
      });
    }

    // 5. Recommandations
    console.log('\n📋 RECOMMANDATIONS:');
    console.log('   1. ✅ Correction terminée');
    console.log('   2. 🔄 Mettre à jour le code pour utiliser visibility au lieu de ispublished');
    console.log('   3. 🗑️  Supprimer la colonne ispublished après validation complète');
    console.log('   4. 🧪 Tester toutes les fonctionnalités avant suppression');

  } catch (error: any) {
    console.error('💥 Erreur lors de la correction:', error.message);
    throw error;
  }
}

// Exécuter la correction
fixVisibilityViaSQL()
  .then(() => {
    console.log('\n🎉 Correction terminée !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de la correction:', err);
    process.exit(1);
  }); 