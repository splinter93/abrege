import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fonction de génération de slug simple
function generateSlug(title) {
  if (!title || typeof title !== 'string') {
    return 'untitled';
  }
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

// Vérifier l'unicité du slug
async function checkSlugUniqueness(slug, userId, excludeId = null) {
  const { data, error } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', slug)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Erreur lors de la vérification d\'unicité:', error);
    return false;
  }

  if (!data || data.length === 0) {
    return true;
  }

  if (excludeId) {
    return !data.some(item => item.id !== excludeId);
  }

  return false;
}

// Générer un slug unique
async function generateUniqueSlug(title, userId, excludeId = null) {
  const baseSlug = generateSlug(title);
  let candidateSlug = baseSlug;
  let counter = 1;

  while (!(await checkSlugUniqueness(candidateSlug, userId, excludeId))) {
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  return candidateSlug;
}

// Construire l'URL publique
async function buildPublicUrl(userId, slug) {
  const { data: user, error } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();

  if (error || !user?.username) {
    console.warn(`⚠️ Impossible de récupérer le username pour l'utilisateur ${userId}`);
    return null;
  }

  return `https://abrege.app/@${user.username}/${slug}`;
}

async function findNotesWithoutSlug() {
  console.log('🔍 Recherche des notes sans slug...');
  
  const { data: notes, error } = await supabase
    .from('articles')
    .select('id, source_title, user_id, created_at')
    .is('slug', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur lors de la recherche:', error);
    return [];
  }

  console.log(`📊 Trouvé ${notes?.length || 0} notes sans slug`);
  return notes || [];
}

async function fixNoteSlug(note) {
  try {
    console.log(`🔧 Correction du slug pour la note: ${note.source_title} (${note.id})`);
    
    // Générer le slug unique
    const slug = await generateUniqueSlug(note.source_title, note.user_id, note.id);
    console.log(`✅ Slug généré: ${slug}`);
    
    // Construire l'URL publique
    const publicUrl = await buildPublicUrl(note.user_id, slug);
    console.log(`✅ URL publique: ${publicUrl || 'Non disponible'}`);
    
    // Mettre à jour la note
    const { error: updateError } = await supabase
      .from('articles')
      .update({ 
        slug,
        public_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', note.id)
      .eq('user_id', note.user_id);

    if (updateError) {
      console.error(`❌ Erreur lors de la mise à jour:`, updateError);
      return false;
    }

    console.log(`✅ Note mise à jour avec succès`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la correction du slug pour ${note.id}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Début de la correction des slugs manquants...\n');
  
  // Trouver les notes sans slug
  const notesWithoutSlug = await findNotesWithoutSlug();
  
  if (notesWithoutSlug.length === 0) {
    console.log('✅ Toutes les notes ont déjà un slug !');
    return;
  }

  console.log('\n📋 Notes à corriger:');
  notesWithoutSlug.forEach((note, index) => {
    console.log(`${index + 1}. ${note.source_title} (${note.id}) - ${new Date(note.created_at).toLocaleDateString()}`);
  });

  console.log('\n🔧 Début de la correction...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const note of notesWithoutSlug) {
    const success = await fixNoteSlug(note);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    console.log(''); // Ligne vide pour la lisibilité
  }

  console.log('\n📊 Résumé de la correction:');
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📝 Total traité: ${notesWithoutSlug.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Toutes les notes ont été corrigées avec succès !');
  } else {
    console.log('\n⚠️ Certaines notes n\'ont pas pu être corrigées. Vérifiez les logs ci-dessus.');
  }
}

// Exécuter le script
main().catch(console.error); 