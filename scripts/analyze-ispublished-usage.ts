#!/usr/bin/env node

/**
 * Script d'analyse de l'usage d'ispublished dans le code
 * 
 * Ce script identifie tous les endroits où ispublished est utilisé
 * pour planifier la migration vers le système de visibilité
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

async function analyzeIspublishedUsage() {
  console.log('🔍 Analyse de l\'usage d\'ispublished...\n');

  try {
    // 1. Analyse de la base de données
    console.log('📊 1. Analyse de la base de données...');
    
    const { data: dbStats, error: dbError } = await supabase
      .from('articles')
      .select('ispublished, visibility, public_url')
      .not('ispublished', 'is', null);

    if (dbError) {
      throw new Error(`Erreur récupération stats DB: ${dbError.message}`);
    }

    if (!dbStats || dbStats.length === 0) {
      console.log('✅ Aucune note avec ispublished trouvée en DB');
    } else {
      console.log(`📝 ${dbStats.length} notes avec ispublished en DB`);
      
      const stats = dbStats.reduce((acc, article) => {
        // ispublished stats
        const ispubKey = `ispublished_${article.ispublished}`;
        acc.ispublished[ispubKey] = (acc.ispublished[ispubKey] || 0) + 1;
        
        // visibility stats
        if (article.visibility) {
          acc.visibility[article.visibility] = (acc.visibility[article.visibility] || 0) + 1;
        }
        
        // public_url stats
        if (article.public_url) {
          acc.hasPublicUrl = (acc.hasPublicUrl || 0) + 1;
        }
        
        return acc;
      }, {
        ispublished: {} as Record<string, number>,
        visibility: {} as Record<string, number>,
        hasPublicUrl: 0
      });

      console.log('   📈 Statistiques ispublished:');
      Object.entries(stats.ispublished).forEach(([key, count]) => {
        console.log(`      - ${key}: ${count}`);
      });

      console.log('   📈 Statistiques visibility:');
      Object.entries(stats.visibility).forEach(([key, count]) => {
        console.log(`      - ${key}: ${count}`);
      });

      console.log(`   📈 Notes avec public_url: ${stats.hasPublicUrl}\n`);
    }

    // 2. Analyse des conflits potentiels
    console.log('⚠️  2. Analyse des conflits potentiels...');
    
    const { data: conflicts, error: conflictsError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility, public_url')
      .not('ispublished', 'is', null)
      .not('visibility', 'is', null);

    if (conflictsError) {
      throw new Error(`Erreur récupération conflits: ${conflictsError.message}`);
    }

    if (conflicts && conflicts.length > 0) {
      console.log(`🔍 ${conflicts.length} notes avec ispublished ET visibility définis`);
      
      const conflictTypes = conflicts.reduce((acc, article) => {
        const key = `ispublished_${article.ispublished}_visibility_${article.visibility}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('   📊 Types de conflits:');
      Object.entries(conflictTypes).forEach(([key, count]) => {
        console.log(`      - ${key}: ${count}`);
      });

      // Exemples de conflits
      console.log('\n   📝 Exemples de conflits:');
      conflicts.slice(0, 5).forEach(article => {
        const status = article.ispublished && article.visibility === 'public' ? '✅' : '⚠️';
        console.log(`      ${status} "${article.source_title}": ispublished=${article.ispublished}, visibility=${article.visibility}`);
      });
    } else {
      console.log('✅ Aucun conflit détecté\n');
    }

    // 3. Recommandations de migration
    console.log('📋 3. Recommandations de migration...');
    
    console.log('   🔄 Migration des données:');
    console.log('      - ispublished = true → visibility = "public"');
    console.log('      - ispublished = false → visibility = "private"');
    console.log('      - ispublished = null → visibility = "private" (par défaut)');
    
    console.log('\n   🗑️  Nettoyage du code:');
    console.log('      - Remplacer toutes les vérifications ispublished par visibility !== "private"');
    console.log('      - Mettre à jour les API pour utiliser le système de visibilité');
    console.log('      - Supprimer la colonne ispublished après validation complète');
    
    console.log('\n   🧪 Tests requis:');
    console.log('      - Vérifier que les notes "publiques" sont accessibles');
    console.log('      - Vérifier que les notes "privées" sont protégées');
    console.log('      - Tester le bouton "œil" dans l\'éditeur');
    console.log('      - Valider les pages publiques');

  } catch (error: any) {
    console.error('💥 Erreur lors de l\'analyse:', error.message);
    throw error;
  }
}

// Exécuter l'analyse
analyzeIspublishedUsage()
  .then(() => {
    console.log('\n🎉 Analyse terminée !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de l\'analyse:', err);
    process.exit(1);
  }); 