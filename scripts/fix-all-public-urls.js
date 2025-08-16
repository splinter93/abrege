#!/usr/bin/env node

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

async function fixAllPublicUrls() {
  console.log('🔧 Correction complète des URLs publiques...');
  console.log(`📡 API Base URL: ${apiBaseUrl}`);
  
  try {
    // Récupérer toutes les notes publiées
    const { data: notes, error } = await supabase
      .from('articles')
      .select('id, slug, source_title, public_url, user_id, ispublished')
      .eq('ispublished', true);

    if (error) {
      console.error('❌ Erreur lors de la récupération des notes:', error);
      return;
    }

    console.log(`📝 ${notes.length} notes publiées trouvées\n`);

    let correctedCount = 0;
    let alreadyCorrectCount = 0;

    for (const note of notes) {
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
      
      // Vérifier si l'URL est déjà correcte
      if (note.public_url === newUrl) {
        console.log(`✅ Note "${note.source_title}": URL déjà correcte`);
        alreadyCorrectCount++;
        continue;
      }

      console.log(`🔧 Note "${note.source_title}":`);
      console.log(`   ID: ${note.id}`);
      console.log(`   Slug: ${note.slug}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Ancienne URL: ${note.public_url || 'Aucune'}`);
      console.log(`   Nouvelle URL: ${newUrl}`);

      // Mettre à jour l'URL
      const { error: updateError } = await supabase
        .from('articles')
        .update({ public_url: newUrl })
        .eq('id', note.id);

      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour de la note ${note.id}:`, updateError);
      } else {
        console.log(`✅ Note "${note.source_title}" mise à jour avec succès`);
        correctedCount++;
      }
      
      console.log(''); // Ligne vide pour la lisibilité
    }

    console.log('📊 Résumé:');
    console.log(`   ✅ URLs corrigées: ${correctedCount}`);
    console.log(`   ⏭️  URLs déjà correctes: ${alreadyCorrectCount}`);
    console.log(`   📝 Total traité: ${notes.length}`);

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

// Exécuter le script
fixAllPublicUrls()
  .then(() => {
    console.log('🎉 Script terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 