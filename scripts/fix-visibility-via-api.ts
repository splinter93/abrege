#!/usr/bin/env node

/**
 * Script de correction de la visibilité via l'API v2
 * Utilise l'endpoint /api/v2/note/[ref]/publish pour contourner RLS
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

async function fixVisibilityViaAPI() {
  console.log('🔧 Correction de la visibilité via API v2...\n');

  try {
    // 1. Récupérer un utilisateur de test
    console.log('👤 1. Récupération d\'un utilisateur de test...');
    
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: 'temp@example.com',
      password: 'temp123456'
    });
    
    if (authError || !user) {
      throw new Error(`Erreur authentification: ${authError?.message || 'Utilisateur non trouvé'}`);
    }

    console.log(`   ✅ Utilisateur anonyme connecté: ${user.id}`);

    // 2. Récupérer les notes avec ispublished = true
    console.log('\n📝 2. Récupération des notes à corriger...');
    
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility, public_url')
      .eq('ispublished', true)
      .limit(10); // Limiter pour le test

    if (notesError) {
      throw new Error(`Erreur récupération notes: ${notesError.message}`);
    }

    if (!notes || notes.length === 0) {
      console.log('✅ Aucune note avec ispublished = true trouvée');
      return;
    }

    console.log(`   📊 ${notes.length} notes trouvées`);
    notes.forEach(note => {
      console.log(`      - "${note.source_title}": ispublished=${note.ispublished}, visibility=${note.visibility}`);
    });

    // 3. Correction via API v2
    console.log('\n🔄 3. Correction via API v2...');
    
    let correctedCount = 0;
    let errorCount = 0;

    for (const note of notes) {
      try {
        console.log(`   📝 Correction de "${note.source_title}"...`);
        
        // Utiliser l'API v2 pour publier la note
        const response = await fetch(`${apiBaseUrl}/api/v2/note/${note.id}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ispublished: true // Garder ispublished = true mais mettre à jour visibility
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`      ✅ Note corrigée: ${result.message}`);
          correctedCount++;
        } else {
          const error = await response.text();
          console.error(`      ❌ Erreur API: ${response.status} - ${error}`);
          errorCount++;
        }

      } catch (error: any) {
        console.error(`      ❌ Erreur traitement note ${note.id}:`, error.message);
        errorCount++;
      }
    }

    // 4. Vérification finale
    console.log('\n🔍 4. Vérification finale...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('articles')
      .select('id, source_title, ispublished, visibility, public_url')
      .eq('ispublished', true)
      .limit(5);

    if (finalError) {
      throw new Error(`Erreur vérification finale: ${finalError.message}`);
    }

    if (finalCheck) {
      console.log('📊 Échantillon après correction:');
      finalCheck.forEach(note => {
        const status = note.visibility === 'public' ? '✅' : '❌';
        console.log(`   ${status} ${note.source_title}: visibility=${note.visibility}, ispublished=${note.ispublished}`);
      });
    }

    // 5. Résumé
    console.log('\n📋 RÉSUMÉ:');
    console.log(`   ✅ Notes corrigées: ${correctedCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   📝 Notes traitées: ${notes.length}`);

    if (correctedCount > 0) {
      console.log('\n🎉 Correction partiellement réussie !');
      console.log('   🔄 Certaines notes ont été corrigées via l\'API');
      console.log('   ⚠️  Les autres nécessitent une approche différente');
    } else {
      console.log('\n⚠️  Aucune note corrigée');
      console.log('   🔍 Vérifier les permissions et l\'état de l\'API');
    }

  } catch (error: any) {
    console.error('💥 Erreur lors de la correction:', error.message);
    throw error;
  }
}

// Exécuter la correction
fixVisibilityViaAPI()
  .then(() => {
    console.log('\n🎉 Script terminé !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erreur fatale:', err);
    process.exit(1);
  }); 