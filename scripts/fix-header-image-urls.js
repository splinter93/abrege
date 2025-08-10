#!/usr/bin/env node

/**
 * Script pour corriger les URLs d'images d'en-tête qui pointent vers localhost
 * Remplace les URLs de l'API par les URLs AWS directes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixHeaderImageUrls() {
  console.log('🔧 Début de la correction des URLs d\'images d\'en-tête...');

  try {
    // 1. Trouver tous les articles avec des URLs localhost dans header_image
    const { data: articles, error: selectError } = await supabase
      .from('articles')
      .select('id, header_image')
      .like('header_image', '%localhost:3000%');

    if (selectError) {
      throw new Error(`Erreur sélection: ${selectError.message}`);
    }

    if (!articles || articles.length === 0) {
      console.log('✅ Aucune URL localhost trouvée');
      return;
    }

    console.log(`📊 ${articles.length} articles avec des URLs localhost trouvés`);

    // 2. Pour chaque article, extraire l'ID du fichier et le corriger
    let fixedCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        // Extraire l'ID du fichier de l'URL localhost
        const match = article.header_image.match(/\/api\/v1\/public\/file\/([^?]+)/);
        if (!match) {
          console.log(`⚠️  URL invalide pour l'article ${article.id}: ${article.header_image}`);
          continue;
        }

        const fileId = match[1];
        console.log(`🔍 Article ${article.id} → Fichier ${fileId}`);

        // 3. Récupérer les infos du fichier
        const { data: file, error: fileError } = await supabase
          .from('files')
          .select('s3_key, etag')
          .eq('id', fileId)
          .single();

        if (fileError || !file) {
          console.log(`❌ Fichier ${fileId} non trouvé: ${fileError?.message}`);
          errorCount++;
          continue;
        }

        // 4. Construire l'URL AWS directe
        const awsUrl = `https://scrivia.s3.eu-west-3.amazonaws.com/${file.s3_key}${file.etag ? `?v=${file.etag}` : ''}`;
        console.log(`🔄 ${article.header_image} → ${awsUrl}`);

        // 5. Mettre à jour l'article
        const { error: updateError } = await supabase
          .from('articles')
          .update({ header_image: awsUrl })
          .eq('id', article.id);

        if (updateError) {
          console.log(`❌ Erreur mise à jour article ${article.id}: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Article ${article.id} mis à jour`);
          fixedCount++;
        }

      } catch (err) {
        console.log(`❌ Erreur traitement article ${article.id}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`✅ ${fixedCount} articles corrigés`);
    console.log(`❌ ${errorCount} erreurs`);
    console.log(`📝 Total traité: ${articles.length}`);

  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
fixHeaderImageUrls()
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur:', error);
    process.exit(1);
  }); 