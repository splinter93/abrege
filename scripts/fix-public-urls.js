#!/usr/bin/env node

/**
 * Script pour corriger les URLs publiques existantes
 * Remplace les anciens formats incorrects par le nouveau format standard
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

async function fixPublicUrls() {
  console.log('🔧 Début de la correction des URLs publiques...');
  console.log(`📡 API Base URL: ${apiBaseUrl}`);
  
  try {
    // Récupérer toutes les notes publiées avec des URLs incorrectes
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id, slug, public_url, user_id, ispublished')
      .eq('ispublished', true)
      .not('public_url', 'is', null);

    if (error) {
      console.error('❌ Erreur lors de la récupération des notes:', error);
      return;
    }

    console.log(`📝 ${notes.length} notes publiées trouvées`);

    let correctedCount = 0;
    let skippedCount = 0;

    for (const note of notes) {
      // Vérifier si l'URL est déjà au bon format
      if (note.public_url && note.public_url.startsWith(apiBaseUrl)) {
        console.log(`✅ Note ${note.id}: URL déjà correcte`);
        skippedCount++;
        continue;
      }

      // Récupérer le username de l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', note.user_id)
        .single();

      if (userError || !user?.username) {
        console.error(`❌ Impossible de récupérer le username pour la note ${note.id}:`, userError);
        continue;
      }

      // Construire la nouvelle URL
      const newUrl = `${apiBaseUrl}/@${user.username}/${note.slug}`;
      
      console.log(`🔧 Note ${note.id}:`);
      console.log(`   Ancienne URL: ${note.public_url}`);
      console.log(`   Nouvelle URL: ${newUrl}`);

      // Mettre à jour l'URL
      const { error: updateError } = await supabase
        .from('articles')
        .update({ public_url: newUrl })
        .eq('id', note.id);

      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour de la note ${note.id}:`, updateError);
      } else {
        console.log(`✅ Note ${note.id} mise à jour avec succès`);
        correctedCount++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`   ✅ URLs corrigées: ${correctedCount}`);
    console.log(`   ⏭️  URLs déjà correctes: ${skippedCount}`);
    console.log(`   📝 Total traité: ${notes.length}`);

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

// Exécuter le script
fixPublicUrls()
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 