#!/usr/bin/env node

/**
 * Script de test pour la construction des URLs
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

async function testUrlConstruction() {
  console.log('🧪 Test de construction des URLs...');
  console.log(`📡 API Base URL: ${apiBaseUrl}\n`);

  try {
    // Récupérer quelques notes de test
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, slug, source_title, public_url, user_id')
      .limit(3);

    if (notesError) {
      throw new Error(`Erreur récupération notes: ${notesError.message}`);
    }

    if (!notes || notes.length === 0) {
      console.log('❌ Aucune note trouvée');
      return;
    }

    console.log(`📝 ${notes.length} notes de test trouvées\n`);

    for (const note of notes) {
      console.log(`📝 Note: ${note.source_title}`);
      console.log(`   ID: ${note.id}`);
      console.log(`   Slug: ${note.slug || 'Aucun slug'}`);
      console.log(`   URL stockée: ${note.public_url || 'Aucune URL'}`);

      if (note.slug) {
        // Récupérer l'utilisateur
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', note.user_id)
          .single();

        if (userError || !user?.username) {
          console.log(`   ❌ Username introuvable pour user_id ${note.user_id}`);
        } else {
          const correctUrl = `${apiBaseUrl}/@${user.username}/${note.slug}`;
          console.log(`   👤 Username: ${user.username}`);
          console.log(`   ✅ URL correcte: ${correctUrl}`);
          
          // Vérifier si l'URL stockée est correcte
          if (note.public_url === correctUrl) {
            console.log(`   🎉 URL déjà correcte !`);
          } else {
            console.log(`   🔄 URL à corriger: ${note.public_url || 'Aucune'} → ${correctUrl}`);
          }
        }
      } else {
        console.log(`   ⚠️  Pas de slug, impossible de construire l'URL`);
      }
      
      console.log(''); // Ligne vide pour la lisibilité
    }

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testUrlConstruction()
  .then(() => {
    console.log('🎉 Test terminé !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 