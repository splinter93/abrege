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

async function verifyUrls() {
  console.log('🔍 Vérification simple des URLs publiques...');
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

    let correctCount = 0;
    let incorrectCount = 0;

    for (const note of notes) {
      // Récupérer le username de l'utilisateur
      const { data: user } = await supabase
        .from('users')
        .select('username')
        .eq('id', note.user_id)
        .single();

      const username = user?.username || 'unknown';
      const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
      
      console.log(`📝 Note: ${note.source_title}`);
      console.log(`   ID: ${note.id}`);
      console.log(`   Slug: ${note.slug}`);
      console.log(`   Username: ${username}`);
      console.log(`   URL actuelle: ${note.public_url || 'Aucune'}`);
      console.log(`   URL attendue: ${expectedUrl}`);

      if (note.public_url === expectedUrl) {
        console.log(`   ✅ Format correct`);
        correctCount++;
      } else {
        console.log(`   ❌ Format incorrect`);
        incorrectCount++;
      }
      
      console.log(''); // Ligne vide pour la lisibilité
    }

    console.log('📊 Résumé:');
    console.log(`   ✅ URLs correctes: ${correctCount}`);
    console.log(`   ❌ URLs incorrectes: ${incorrectCount}`);
    console.log(`   📝 Total: ${notes.length}`);

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

// Exécuter le script
verifyUrls()
  .then(() => {
    console.log('🎉 Vérification terminée');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 