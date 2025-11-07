/**
 * Script pour corriger les URLs publiques des notes
 * Retire le /id/ du format ancien vers le nouveau format
 * 
 * Ancien: https://scrivia.app/@username/id/uuid
 * Nouveau: https://scrivia.app/@username/uuid
 * 
 * Usage: npx tsx scripts/fix-public-urls.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPublicUrls() {
  console.log('🔧 Correction des URLs publiques...\n');

  try {
    // Récupérer toutes les notes avec leurs users
    const { data: notes, error: fetchError } = await supabase
      .from('articles')
      .select(`
        id,
        public_url,
        user_id,
        users!inner(username)
      `);

    if (fetchError) {
      console.error('❌ Erreur récupération notes:', fetchError);
      return;
    }

    console.log(`📊 Total notes: ${notes.length}\n`);

    let correctedCount = 0;
    let alreadyCorrectCount = 0;

    for (const note of notes) {
      const noteWithUser = note as { users?: { username?: string } };
      const username = noteWithUser.users?.username;

      if (!username) {
        console.warn(`⚠️  Note ${note.id}: pas de username`);
        continue;
      }

      if (!note.public_url) {
        console.warn(`⚠️  Note ${note.id}: pas d'URL publique`);
        continue;
      }

      // Format correct: https://scrivia.app/@username/uuid
      const correctUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/@${username}/${note.id}`;

      // Si l'URL est déjà correcte, skip
      if (note.public_url === correctUrl) {
        alreadyCorrectCount++;
        continue;
      }

      // Vérifier si c'est l'ancien format avec /id/
      const hasOldFormat = note.public_url.includes('/id/');

      if (hasOldFormat) {
        console.log(`🔧 Correction note ${note.id}:`);
        console.log(`   Ancien: ${note.public_url}`);
        console.log(`   Nouveau: ${correctUrl}`);

        // Mettre à jour
        const { error: updateError } = await supabase
          .from('articles')
          .update({ public_url: correctUrl })
          .eq('id', note.id);

        if (updateError) {
          console.error(`   ❌ Erreur: ${updateError.message}`);
        } else {
          console.log(`   ✅ Corrigée\n`);
          correctedCount++;
        }
      } else {
        // Autre format incorrect
        console.log(`⚠️  Note ${note.id}: format URL inattendu: ${note.public_url}`);
      }
    }

    console.log('\n📊 RÉSULTATS:');
    console.log(`   ✅ URLs déjà correctes: ${alreadyCorrectCount}`);
    console.log(`   🔧 URLs corrigées: ${correctedCount}`);
    console.log(`   📝 Total traité: ${notes.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixPublicUrls();

