#!/usr/bin/env node

/**
 * Script de correction des URLs utilisant l'API authentifiée
 * Contourne les restrictions RLS en utilisant l'API
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

async function fixUrlsViaAPI() {
  console.log('🔧 Correction des URLs via l\'API authentifiée...');
  console.log(`📡 API Base URL: ${apiBaseUrl}\n`);
  
  try {
    // 1. Récupérer toutes les notes via l'API
    console.log('📊 1. Récupération des notes via l\'API...');
    const notesResponse = await fetch(`${apiBaseUrl}/api/v1/notes/recent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'test'}`
      }
    });

    if (!notesResponse.ok) {
      console.log('⚠️  API notes non accessible, utilisation directe de la base...');
      await fixUrlsDirectly();
      return;
    }

    const notes = await notesResponse.json();
    console.log(`📝 ${notes.length} notes récupérées via l'API`);

    // 2. Traiter chaque note
    console.log('\n🔧 2. Correction des URLs via l\'API...');
    let correctedCount = 0;
    let errorCount = 0;

    for (const note of notes) {
      try {
        if (!note.slug) {
          console.log(`⚠️  Note ${note.id}: Pas de slug, impossible de corriger`);
          continue;
        }

        // Construire la nouvelle URL
        const newUrl = `${apiBaseUrl}/@${note.username || 'splinter'}/${note.slug}`;
        
        if (note.public_url === newUrl) {
          console.log(`✅ Note ${note.id}: URL déjà correcte`);
          continue;
        }

        console.log(`🔄 Note ${note.id}: ${note.public_url || 'Aucune'} → ${newUrl}`);

        // Mise à jour via l'API de publication
        const publishResponse = await fetch(`${apiBaseUrl}/api/v1/note/${note.id}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'test'}`
          },
          body: JSON.stringify({ ispublished: true })
        });

        if (publishResponse.ok) {
          console.log(`✅ Note ${note.id}: URL corrigée via l'API`);
          correctedCount++;
        } else {
          console.log(`❌ Erreur API pour note ${note.id}: ${publishResponse.status}`);
          errorCount++;
        }

      } catch (error: any) {
        console.error(`❌ Erreur traitement note ${note.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📋 RÉSUMÉ:');
    console.log(`   ✅ URLs corrigées: ${correctedCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   📝 Notes traitées: ${notes.length}`);

  } catch (error: any) {
    console.error('💥 Erreur fatale:', error.message);
    console.log('🔄 Fallback vers correction directe...');
    await fixUrlsDirectly();
  }
}

async function fixUrlsDirectly() {
  console.log('🔧 Correction directe des URLs dans la base...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Récupérer toutes les notes
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, slug, source_title, public_url, user_id');

    if (notesError) {
      throw new Error(`Erreur récupération notes: ${notesError.message}`);
    }

    if (!notes || notes.length === 0) {
      console.log('✅ Aucune note à traiter');
      return;
    }

    console.log(`📝 ${notes.length} notes trouvées`);

    // Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) {
      throw new Error(`Erreur récupération utilisateurs: ${usersError.message}`);
    }

    const userMap = new Map(users?.map(u => [u.id, u.username]) || []);
    console.log(`👤 ${userMap.size} utilisateurs trouvés`);

    // Traiter chaque note
    let correctedCount = 0;
    let errorCount = 0;

    for (const note of notes) {
      try {
        const username = userMap.get(note.user_id);
        if (!username) {
          console.log(`⚠️  Note ${note.id}: Username introuvable pour user_id ${note.user_id}`);
          continue;
        }

        if (!note.slug) {
          console.log(`⚠️  Note ${note.id}: Pas de slug, impossible de corriger`);
          continue;
        }

        const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
        
        if (note.public_url === expectedUrl) {
          console.log(`✅ Note ${note.id}: URL déjà correcte`);
          continue;
        }

        console.log(`🔄 Note ${note.id}: ${note.public_url || 'Aucune'} → ${expectedUrl}`);

        // Mise à jour de l'URL
        const { error: updateError } = await supabase
          .from('articles')
          .update({ 
            public_url: expectedUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', note.id);

        if (updateError) {
          console.error(`❌ Erreur mise à jour note ${note.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Note ${note.id}: URL corrigée`);
          correctedCount++;
        }

      } catch (error: any) {
        console.error(`❌ Erreur traitement note ${note.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📋 RÉSUMÉ:');
    console.log(`   ✅ URLs corrigées: ${correctedCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   📝 Notes traitées: ${notes.length}`);

  } catch (error: any) {
    console.error('💥 Erreur dans fixUrlsDirectly:', error.message);
    throw error;
  }
}

// Exécuter la correction
fixUrlsViaAPI()
  .then(() => {
    console.log('\n🎉 Correction terminée avec succès !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de la correction:', err);
    process.exit(1);
  }); 