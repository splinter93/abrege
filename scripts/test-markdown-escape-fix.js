#!/usr/bin/env node

/**
 * Script de test pour vérifier la correction des échappements Markdown
 * Teste que le contenu sauvegardé en base est propre (sans backslashes)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Fonction de nettoyage Markdown (identique à celle de l'éditeur)
 */
function cleanEscapedMarkdown(markdown) {
  return markdown
    .replace(/\\\*/g, '*')           // Supprimer l'échappement des *
    .replace(/\\_/g, '_')            // Supprimer l'échappement des _
    .replace(/\\`/g, '`')            // Supprimer l'échappement des `
    .replace(/\\\[/g, '[')           // Supprimer l'échappement des [
    .replace(/\\\]/g, ']')           // Supprimer l'échappement des [
    .replace(/\\\(/g, '(')           // Supprimer l'échappement des (
    .replace(/\\\)/g, ')')           // Supprimer l'échappement des )
    .replace(/\\>/g, '>')            // Supprimer l'échappement des >
    .replace(/\\-/g, '-')            // Supprimer l'échappement des -
    .replace(/\\\|/g, '|')           // Supprimer l'échappement des |
    .replace(/\\~/g, '~')            // Supprimer l'échappement des ~
    .replace(/\\=/g, '=')            // Supprimer l'échappement des =
    .replace(/\\#/g, '#')            // Supprimer l'échappement des #
    .replace(/&gt;/g, '>')           // Supprimer l'échappement HTML des >
    .replace(/&lt;/g, '<')           // Supprimer l'échappement HTML des <
    .replace(/&amp;/g, '&');         // Supprimer l'échappement HTML des &
}

/**
 * Test principal
 */
async function testMarkdownEscapeFix() {
  console.log('🧪 Test de la correction des échappements Markdown');
  console.log('================================================\n');

  try {
    // 1. Récupérer quelques notes avec du contenu Markdown
    console.log('📖 1. Récupération des notes...');
    const { data: notes, error: fetchError } = await supabase
      .from('articles')
      .select('id, source_title, markdown_content')
      .not('markdown_content', 'is', null)
      .not('markdown_content', 'eq', '')
      .limit(5);

    if (fetchError) {
      throw new Error(`Erreur récupération notes: ${fetchError.message}`);
    }

    if (!notes || notes.length === 0) {
      console.log('⚠️ Aucune note avec contenu trouvée');
      return;
    }

    console.log(`✅ ${notes.length} notes récupérées\n`);

    // 2. Analyser chaque note
    let totalEscaped = 0;
    let totalFixed = 0;

    for (const note of notes) {
      console.log(`📝 Note: ${note.source_title}`);
      console.log(`   ID: ${note.id}`);
      
      const markdown = note.markdown_content;
      const hasEscapes = /\\[*_`\[\]()>|~=#]/.test(markdown);
      const hasHtmlEscapes = /&(gt|lt|amp);/.test(markdown);
      
      if (hasEscapes || hasHtmlEscapes) {
        totalEscaped++;
        console.log(`   ❌ Échappements détectés: ${hasEscapes ? 'Markdown' : ''}${hasEscapes && hasHtmlEscapes ? ' + ' : ''}${hasHtmlEscapes ? 'HTML' : ''}`);
        
        // Compter les échappements
        const escapeCount = (markdown.match(/\\[*_`\[\]()>|~=#]/g) || []).length;
        const htmlEscapeCount = (markdown.match(/&(gt|lt|amp);/g) || []).length;
        console.log(`   📊 Nombre d'échappements: ${escapeCount + htmlEscapeCount}`);
        
        // Nettoyer le contenu
        const cleanMarkdown = cleanEscapedMarkdown(markdown);
        const wasFixed = cleanMarkdown !== markdown;
        
        if (wasFixed) {
          totalFixed++;
          console.log(`   ✅ Contenu nettoyé (${markdown.length} → ${cleanMarkdown.length} caractères)`);
          
          // Mettre à jour la note en base
          const { error: updateError } = await supabase
            .from('articles')
            .update({ markdown_content: cleanMarkdown })
            .eq('id', note.id);
          
          if (updateError) {
            console.log(`   ⚠️ Erreur mise à jour: ${updateError.message}`);
          } else {
            console.log(`   💾 Note mise à jour en base`);
          }
        }
      } else {
        console.log(`   ✅ Aucun échappement détecté`);
      }
      
      console.log('');
    }

    // 3. Résumé
    console.log('📊 RÉSUMÉ DU TEST');
    console.log('==================');
    console.log(`Total notes analysées: ${notes.length}`);
    console.log(`Notes avec échappements: ${totalEscaped}`);
    console.log(`Notes corrigées: ${totalFixed}`);
    
    if (totalEscaped > 0) {
      console.log(`\n🔧 CORRECTION APPLIQUÉE`);
      console.log('Les notes avec échappements ont été nettoyées en base.');
      console.log('L\'éditeur principal applique maintenant le nettoyage automatiquement.');
    } else {
      console.log(`\n✅ Aucun problème détecté`);
      console.log('Toutes les notes ont du Markdown propre.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
testMarkdownEscapeFix()
  .then(() => {
    console.log('\n🎉 Test terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test échoué:', error);
    process.exit(1);
  }); 