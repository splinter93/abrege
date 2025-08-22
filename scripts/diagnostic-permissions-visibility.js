import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnosticPermissions() {
  try {
    console.log('🔍 Diagnostic des permissions et de la visibilité des notes...\n');

    // 1. Vérifier l'état de la base de données
    console.log('1️⃣ Vérification de la base de données...');
    
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings, user_id, created_at')
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('❌ Erreur lors de la récupération des notes:', notesError.message);
      return;
    }

    console.log(`📊 Total des notes: ${notes.length}\n`);

    // 2. Analyser chaque note
    console.log('2️⃣ Analyse détaillée des notes...\n');
    
    notes.forEach((note, index) => {
      console.log(`📝 Note ${index + 1}: "${note.source_title}"`);
      console.log(`   - ID: ${note.id}`);
      console.log(`   - Slug: ${note.slug || '❌ MANQUANT'}`);
      console.log(`   - User ID: ${note.user_id}`);
      console.log(`   - Share Settings:`, note.share_settings || '❌ MANQUANT');
      console.log(`   - Visibilité: ${note.share_settings?.visibility || '❌ NON DÉFINIE'}`);
      console.log('');
    });

    // 3. Vérifier les notes sans share_settings
    console.log('3️⃣ Vérification des notes sans share_settings...\n');
    
    const notesWithoutShareSettings = notes.filter(note => !note.share_settings);
    if (notesWithoutShareSettings.length > 0) {
      console.log(`⚠️  ${notesWithoutShareSettings.length} note(s) sans share_settings:`);
      notesWithoutShareSettings.forEach(note => {
        console.log(`   - "${note.source_title}" (ID: ${note.id})`);
      });
    } else {
      console.log('✅ Toutes les notes ont des share_settings');
    }

    // 4. Vérifier les notes sans slug
    console.log('\n4️⃣ Vérification des notes sans slug...\n');
    
    const notesWithoutSlug = notes.filter(note => !note.slug);
    if (notesWithoutSlug.length > 0) {
      console.log(`⚠️  ${notesWithoutSlug.length} note(s) sans slug:`);
      notesWithoutSlug.forEach(note => {
        console.log(`   - "${note.source_title}" (ID: ${note.id})`);
      });
    } else {
      console.log('✅ Toutes les notes ont un slug');
    }

    // 5. Résumé des permissions
    console.log('\n5️⃣ Résumé des permissions...\n');
    
    const visibilityStats = notes.reduce((acc, note) => {
      const visibility = note.share_settings?.visibility || 'undefined';
      acc[visibility] = (acc[visibility] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Répartition par visibilité:');
    Object.entries(visibilityStats).forEach(([visibility, count]) => {
      console.log(`   - ${visibility}: ${count} note(s)`);
    });

    // 6. Vérifier les notes publiques
    console.log('\n6️⃣ Vérification des notes publiques...\n');
    
    const publicNotes = notes.filter(note => 
      note.share_settings?.visibility !== 'private' && 
      note.share_settings?.visibility !== 'undefined'
    );
    
    if (publicNotes.length > 0) {
      console.log(`🌐 ${publicNotes.length} note(s) publique(s):`);
      publicNotes.forEach(note => {
        console.log(`   - "${note.source_title}" (ID: ${note.id})`);
        console.log(`     Visibilité: ${note.share_settings.visibility}`);
        console.log(`     Slug: ${note.slug}`);
        console.log(`     URL publique: /@username/${note.slug}`);
        console.log('');
      });
    } else {
      console.log('🔒 Toutes les notes sont privées');
    }

    // 7. Recommandations
    console.log('\n7️⃣ Recommandations...\n');
    
    if (notesWithoutShareSettings.length > 0) {
      console.log('🔧 Actions recommandées:');
      console.log('   1. Ajouter des share_settings par défaut aux notes manquantes');
      console.log('   2. Vérifier que toutes les notes ont visibility: "private" par défaut');
    }

    if (notesWithoutSlug.length > 0) {
      console.log('🔧 Actions recommandées:');
      console.log('   1. Générer des slugs pour les notes manquantes');
      console.log('   2. Vérifier le processus de génération automatique des slugs');
    }

    if (publicNotes.length === 0) {
      console.log('🔧 Actions recommandées:');
      console.log('   1. Tester le bouton œil avec une note privée (devrait afficher "note privée")');
      console.log('   2. Changer la visibilité d\'une note pour tester le bouton œil');
    }

    console.log('\n🎯 Diagnostic terminé!');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le diagnostic
diagnosticPermissions().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 