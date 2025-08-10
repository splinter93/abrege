#!/usr/bin/env node

/**
 * Script pour vérifier l'état des URLs d'images dans les articles
 * et identifier celles qui pourraient encore avoir des URLs avec signature
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkImageUrls() {
  console.log('🔍 Vérification des URLs d\'images dans les articles...\n');

  try {
    // Récupérer tous les articles avec des images d'en-tête
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, header_image, markdown_content, created_at')
      .or('header_image.not.is.null,markdown_content.neq.\'\'');

    if (articlesError) {
      console.error('❌ Erreur récupération articles:', articlesError.message);
      return;
    }

    if (!articles || articles.length === 0) {
      console.log('ℹ️  Aucun article trouvé');
      return;
    }

    console.log(`📊 ${articles.length} articles analysés\n`);

    let cleanUrls = 0;
    let signedUrls = 0;
    let otherUrls = 0;
    let problematicUrls = [];
    let contentImages = 0;

    for (const article of articles) {
      // Vérifier l'image d'en-tête
      if (article.header_image) {
        const url = article.header_image;
        if (url.includes('s3.amazonaws.com') && !url.includes('?X-Amz')) {
          cleanUrls++;
          console.log(`✅ Article ${article.id}: Image d'en-tête - URL AWS propre`);
        } else if (url.includes('?X-Amz') || url.includes('&X-Amz')) {
          signedUrls++;
          problematicUrls.push({ 
            id: article.id, 
            url, 
            type: 'header_image',
            created_at: article.created_at 
          });
          console.log(`❌ Article ${article.id}: Image d'en-tête - URL avec signature AWS`);
        } else if (url.startsWith('/api/')) {
          otherUrls++;
          console.log(`ℹ️  Article ${article.id}: Image d'en-tête - URL locale API`);
        } else {
          otherUrls++;
          console.log(`❓ Article ${article.id}: Image d'en-tête - URL inconnue: ${url}`);
        }
      }

      // Vérifier les images dans le contenu markdown
      if (article.markdown_content) {
        const imageMatches = article.markdown_content.match(/!\[.*?\]\((.*?)\)/g);
        if (imageMatches) {
          contentImages += imageMatches.length;
          for (const match of imageMatches) {
            const urlMatch = match.match(/!\[.*?\]\((.*?)\)/);
            if (urlMatch) {
              const url = urlMatch[1];
              if (url.includes('s3.amazonaws.com') && !url.includes('?X-Amz')) {
                cleanUrls++;
                console.log(`✅ Article ${article.id}: Image contenu - URL AWS propre`);
              } else if (url.includes('?X-Amz') || url.includes('&X-Amz')) {
                signedUrls++;
                problematicUrls.push({ 
                  id: article.id, 
                  url, 
                  type: 'content_image',
                  created_at: article.created_at 
                });
                console.log(`❌ Article ${article.id}: Image contenu - URL avec signature AWS`);
              } else if (url.startsWith('/api/')) {
                otherUrls++;
                console.log(`ℹ️  Article ${article.id}: Image contenu - URL locale API`);
              } else if (url.startsWith('http')) {
                otherUrls++;
                console.log(`ℹ️  Article ${article.id}: Image contenu - URL externe: ${url}`);
              } else {
                otherUrls++;
                console.log(`❓ Article ${article.id}: Image contenu - URL inconnue: ${url}`);
              }
            }
          }
        }
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`✅ URLs AWS propres: ${cleanUrls}`);
    console.log(`❌ URLs avec signature: ${signedUrls}`);
    console.log(`ℹ️  Autres URLs: ${otherUrls}`);
    console.log(`📝 Images dans le contenu: ${contentImages}`);

    if (problematicUrls.length > 0) {
      console.log('\n🚨 Articles avec URLs problématiques:');
      problematicUrls.forEach(item => {
        console.log(`  - Article ${item.id} (${item.type}, créé: ${item.created_at}): ${item.url}`);
      });

      console.log('\n💡 Ces articles doivent être corrigés pour utiliser des URLs AWS propres.');
      console.log('   Utilisez le script fix-image-urls.js pour les corriger.');
    } else {
      console.log('\n🎉 Toutes les URLs d\'images sont propres !');
    }

  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter la vérification
checkImageUrls(); 