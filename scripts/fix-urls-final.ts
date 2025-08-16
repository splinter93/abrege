#!/usr/bin/env node

/**
 * Script final de correction des URLs
 * Utilise la publication/dépublication pour forcer la mise à jour
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

if (!apiBaseUrl) {
  console.error('❌ NEXT_PUBLIC_API_BASE_URL manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixUrlsFinal() {
  console.log('🔧 Correction finale des URLs...');
  console.log(`📡 API Base URL: ${apiBaseUrl}\n`);
  
  try {
    // 1. Récupérer toutes les notes
    console.log('📊 1. Récupération des notes...');
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, slug, source_title, public_url, user_id, ispublished');

    if (notesError) {
      throw new Error(`Erreur récupération notes: ${notesError.message}`);
    }

    if (!notes || notes.length === 0) {
      console.log('✅ Aucune note à traiter');
      return;
    }

    console.log(`📝 ${notes.length} notes trouvées`);

    // 2. Récupérer les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) {
      throw new Error(`Erreur récupération utilisateurs: ${usersError.message}`);
    }

    const userMap = new Map(users?.map(u => [u.id, u.username]) || []);
    console.log(`👤 ${userMap.size} utilisateurs trouvés`);

    // 3. Analyser et corriger
    console.log('\n🔧 2. Analyse et correction des URLs...');
    let correctedCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const note of notes) {
      try {
        const username = userMap.get(note.user_id);
        if (!username) {
          console.log(`⚠️  Note ${note.id}: Username introuvable`);
          continue;
        }

        if (!note.slug) {
          console.log(`⚠️  Note ${note.id}: Pas de slug`);
          continue;
        }

        const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
        
        if (note.public_url === expectedUrl) {
          console.log(`✅ Note ${note.id}: URL déjà correcte`);
          skipCount++;
          continue;
        }

        console.log(`🔄 Note ${note.id}: ${note.public_url || 'Aucune'} → ${expectedUrl}`);

        // 4. Forcer la mise à jour via publication/dépublication
        if (note.ispublished) {
          // Dépublier puis republier pour forcer la mise à jour
          console.log(`   📤 Dépublier la note ${note.id}...`);
          const { error: unpublishError } = await supabase
            .from('articles')
            .update({ 
              ispublished: false,
              public_url: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id);

          if (unpublishError) {
            console.error(`   ❌ Erreur dépublier note ${note.id}:`, unpublishError.message);
            errorCount++;
            continue;
          }

          // Attendre un peu
          await new Promise(resolve => setTimeout(resolve, 100));

          // Republier avec la bonne URL
          console.log(`   📥 Republier la note ${note.id}...`);
          const { error: republishError } = await supabase
            .from('articles')
            .update({ 
              ispublished: true,
              public_url: expectedUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id);

          if (republishError) {
            console.error(`   ❌ Erreur republier note ${note.id}:`, republishError.message);
            errorCount++;
          } else {
            console.log(`   ✅ Note ${note.id}: URL corrigée via publication`);
            correctedCount++;
          }
        } else {
          // Note non publiée, juste mettre à jour l'URL
          const { error: updateError } = await supabase
            .from('articles')
            .update({ 
              public_url: expectedUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', note.id);

          if (updateError) {
            console.error(`   ❌ Erreur mise à jour note ${note.id}:`, updateError.message);
            errorCount++;
          } else {
            console.log(`   ✅ Note ${note.id}: URL corrigée`);
            correctedCount++;
          }
        }

      } catch (error: any) {
        console.error(`❌ Erreur traitement note ${note.id}:`, error.message);
        errorCount++;
      }
    }

    // 5. Résumé
    console.log('\n📋 RÉSUMÉ:');
    console.log(`   ✅ URLs corrigées: ${correctedCount}`);
    console.log(`   ⏭️  URLs ignorées: ${skipCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   📝 Notes traitées: ${notes.length}`);

    // 6. Vérification finale
    console.log('\n🔍 3. Vérification finale...');
    const { data: finalCheck } = await supabase
      .from('articles')
      .select('id, slug, public_url, user_id')
      .limit(5);

    if (finalCheck) {
      console.log('📊 Échantillon des URLs après correction:');
      finalCheck.forEach(note => {
        const username = userMap.get(note.user_id);
        const expectedUrl = username ? `${apiBaseUrl}/@${username}/${note.slug}` : 'Username introuvable';
        const status = note.public_url === expectedUrl ? '✅' : '❌';
        console.log(`   ${status} ${note.id}: ${note.public_url || 'Aucune'}`);
      });
    }

  } catch (error: any) {
    console.error('💥 Erreur fatale:', error.message);
    throw error;
  }
}

// Exécuter la correction
fixUrlsFinal()
  .then(() => {
    console.log('\n🎉 Correction finale terminée avec succès !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de la correction:', err);
    process.exit(1);
  }); 