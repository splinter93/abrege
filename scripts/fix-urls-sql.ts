#!/usr/bin/env node

/**
 * Script de correction des URLs utilisant SQL direct
 * Contourne les restrictions RLS en utilisant des requêtes SQL
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

async function fixUrlsWithSQL() {
  console.log('🔧 Correction des URLs avec SQL direct...');
  console.log(`📡 API Base URL: ${apiBaseUrl}\n`);
  
  try {
    // 1. Vérifier l'état actuel
    console.log('📊 1. État actuel des URLs...');
    const { data: currentUrls, error: fetchError } = await supabase
      .from('articles')
      .select('id, slug, source_title, public_url, user_id');

    if (fetchError) {
      throw new Error(`Erreur récupération notes: ${fetchError.message}`);
    }

    if (!currentUrls || currentUrls.length === 0) {
      console.log('✅ Aucune note à traiter');
      return;
    }

    console.log(`📝 ${currentUrls.length} notes trouvées`);

    // 2. Récupérer les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) {
      throw new Error(`Erreur récupération utilisateurs: ${usersError.message}`);
    }

    const userMap = new Map(users?.map(u => [u.id, u.username]) || []);
    console.log(`👤 ${userMap.size} utilisateurs trouvés`);

    // 3. Préparer les mises à jour SQL
    console.log('\n🔧 2. Préparation des mises à jour SQL...');
    let updateCount = 0;
    let skipCount = 0;

    for (const note of currentUrls) {
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
      updateCount++;
    }

    if (updateCount === 0) {
      console.log('✅ Aucune URL à corriger');
      return;
    }

    console.log(`\n📊 Résumé des actions: ${updateCount} URLs à corriger, ${skipCount} à ignorer`);

    // 4. Exécuter les mises à jour avec SQL
    console.log('\n🔧 3. Exécution des mises à jour SQL...');
    
    // Utiliser une requête SQL directe pour mettre à jour toutes les URLs
    const sqlQuery = `
      UPDATE articles 
      SET 
        public_url = CASE 
          WHEN slug IS NOT NULL AND user_id IN (
            SELECT id FROM users WHERE username IS NOT NULL
          ) THEN 
            CONCAT(
              '${apiBaseUrl}/@',
              (SELECT username FROM users WHERE users.id = articles.user_id),
              '/',
              slug
            )
          ELSE public_url
        END,
        updated_at = NOW()
      WHERE 
        slug IS NOT NULL 
        AND user_id IN (SELECT id FROM users WHERE username IS NOT NULL)
    `;

    console.log('📝 Exécution de la requête SQL...');
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlQuery });

    if (sqlError) {
      console.log('⚠️  RPC exec_sql non disponible, utilisation des mises à jour individuelles...');
      await updateUrlsIndividually(currentUrls, userMap);
    } else {
      console.log('✅ Mise à jour SQL réussie');
    }

    // 5. Vérification finale
    console.log('\n🔍 4. Vérification finale...');
    const { data: finalCheck } = await supabase
      .from('articles')
      .select('id, slug, public_url, user_id')
      .limit(5);

    if (finalCheck) {
      console.log('📊 Échantillon des URLs après correction:');
      finalCheck.forEach(note => {
        const username = userMap.get(note.user_id);
        const expectedUrl = username ? `${apiBaseUrl}/@${username}/${note.slug}` : 'Username introuvable';
        console.log(`   ${note.id}: ${note.public_url || 'Aucune'} (attendu: ${expectedUrl})`);
      });
    }

  } catch (error: any) {
    console.error('💥 Erreur fatale:', error.message);
    throw error;
  }
}

async function updateUrlsIndividually(notes: any[], userMap: Map<string, string>) {
  console.log('🔧 Mise à jour individuelle des URLs...');
  
  let correctedCount = 0;
  let errorCount = 0;

  for (const note of notes) {
    try {
      const username = userMap.get(note.user_id);
      if (!username || !note.slug) continue;

      const expectedUrl = `${apiBaseUrl}/@${username}/${note.slug}`;
      
      if (note.public_url === expectedUrl) continue;

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
        correctedCount++;
      }

    } catch (error: any) {
      console.error(`❌ Erreur traitement note ${note.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`📊 Mise à jour individuelle: ${correctedCount} corrigées, ${errorCount} erreurs`);
}

// Exécuter la correction
fixUrlsWithSQL()
  .then(() => {
    console.log('\n🎉 Correction terminée avec succès !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale lors de la correction:', err);
    process.exit(1);
  }); 