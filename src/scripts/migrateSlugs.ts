import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement depuis .env
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// [TEMP] USER_ID HARDCODED FOR DEV/LLM
const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";

// Fonction de génération de slug locale pour éviter les conflits
async function generateSlug(title: string, type: 'note' | 'folder' | 'classeur', userId: string): Promise<string> {
  const getTableName = (type: 'note' | 'folder' | 'classeur'): string => {
    switch (type) {
      case 'note': return 'articles';
      case 'folder': return 'folders';
      case 'classeur': return 'classeurs';
    }
  };

  const checkUniqueness = async (slug: string, type: 'note' | 'folder' | 'classeur', userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from(getTableName(type))
      .select('id')
      .eq('slug', slug)
      .eq('user_id', userId);
    
    if (!data) return true;
    return data.length === 0;
  };

  const slugify = (text: string): string => {
    return text
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  let baseSlug = slugify(title);
  let candidateSlug = baseSlug;
  let counter = 1;
  
  while (!(await checkUniqueness(candidateSlug, type, userId))) {
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
  
  return candidateSlug;
}

async function migrateNotes() {
  console.log('🔄 Migration des slugs pour les notes...');
  
  // Récupérer toutes les notes sans slug
  const { data: notes, error } = await supabase
    .from('articles')
    .select('id, source_title, slug')
    .is('slug', null);
  
  if (error) {
    console.error('❌ Erreur lors de la récupération des notes:', error);
    return;
  }
  
  console.log(`📝 ${notes?.length || 0} notes à migrer`);
  
  if (!notes || notes.length === 0) {
    console.log('✅ Aucune note à migrer');
    return;
  }
  
  // Migrer chaque note
  for (const note of notes) {
    try {
      const slug = await generateSlug(note.source_title, 'note', USER_ID);
      
      const { error: updateError } = await supabase
        .from('articles')
        .update({ slug })
        .eq('id', note.id);
      
      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour de la note ${note.id}:`, updateError);
      } else {
        console.log(`✅ Note migrée: "${note.source_title}" -> "${slug}"`);
      }
    } catch (err) {
      console.error(`❌ Erreur lors de la migration de la note ${note.id}:`, err);
    }
  }
}

async function migrateFolders() {
  console.log('🔄 Migration des slugs pour les dossiers...');
  
  // Récupérer tous les dossiers sans slug
  const { data: folders, error } = await supabase
    .from('folders')
    .select('id, name, slug')
    .is('slug', null);
  
  if (error) {
    console.error('❌ Erreur lors de la récupération des dossiers:', error);
    return;
  }
  
  console.log(`📁 ${folders?.length || 0} dossiers à migrer`);
  
  if (!folders || folders.length === 0) {
    console.log('✅ Aucun dossier à migrer');
    return;
  }
  
  // Migrer chaque dossier
  for (const folder of folders) {
    try {
      const slug = await generateSlug(folder.name, 'folder', USER_ID);
      
      const { error: updateError } = await supabase
        .from('folders')
        .update({ slug })
        .eq('id', folder.id);
      
      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour du dossier ${folder.id}:`, updateError);
      } else {
        console.log(`✅ Dossier migré: "${folder.name}" -> "${slug}"`);
      }
    } catch (err) {
      console.error(`❌ Erreur lors de la migration du dossier ${folder.id}:`, err);
    }
  }
}

async function migrateClasseurs() {
  console.log('🔄 Migration des slugs pour les classeurs...');
  
  // Récupérer tous les classeurs sans slug
  const { data: classeurs, error } = await supabase
    .from('classeurs')
    .select('id, name, slug')
    .is('slug', null);
  
  if (error) {
    console.error('❌ Erreur lors de la récupération des classeurs:', error);
    return;
  }
  
  console.log(`📚 ${classeurs?.length || 0} classeurs à migrer`);
  
  if (!classeurs || classeurs.length === 0) {
    console.log('✅ Aucun classeur à migrer');
    return;
  }
  
  // Migrer chaque classeur
  for (const classeur of classeurs) {
    try {
      const slug = await generateSlug(classeur.name, 'classeur', USER_ID);
      
      const { error: updateError } = await supabase
        .from('classeurs')
        .update({ slug })
        .eq('id', classeur.id);
      
      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour du classeur ${classeur.id}:`, updateError);
      } else {
        console.log(`✅ Classeur migré: "${classeur.name}" -> "${slug}"`);
      }
    } catch (err) {
      console.error(`❌ Erreur lors de la migration du classeur ${classeur.id}:`, err);
    }
  }
}

async function main() {
  console.log('🚀 Début de la migration des slugs...');
  console.log('=====================================');
  
  try {
    await migrateNotes();
    console.log('---');
    await migrateFolders();
    console.log('---');
    await migrateClasseurs();
    console.log('---');
    
    console.log('✅ Migration terminée !');
  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

export { main as migrateSlugs }; 