import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement depuis .env
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
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

  const baseSlug = slugify(title);
  let candidateSlug = baseSlug;
  let counter = 1;
  
  while (!(await checkUniqueness(candidateSlug, type, userId))) {
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
  
  return candidateSlug;
}

async function testSlugGeneration() {
  console.log('🧪 Test de génération de slugs...');
  console.log('=====================================');
  
  try {
    // Test avec des exemples
    const testCases = [
      { title: 'Ma première note', type: 'note' as const },
      { title: 'Mon dossier important', type: 'folder' as const },
      { title: 'Classeur de travail', type: 'classeur' as const },
      { title: 'Note avec caractères spéciaux: éàç!', type: 'note' as const },
      { title: 'Dossier avec espaces multiples', type: 'folder' as const },
    ];
    
    for (const testCase of testCases) {
      try {
        const slug = await generateSlug(testCase.title, testCase.type, USER_ID);
        console.log(`✅ "${testCase.title}" -> "${slug}" (${testCase.type})`);
      } catch (err) {
        console.error(`❌ Erreur pour "${testCase.title}":`, err);
      }
    }
    
    console.log('');
    console.log('🎯 Test de résolution de références...');
    
    // Test de résolution (simulation)
    const testRefs = [
      'ma-premiere-note',
      'mon-dossier-important', 
      'classeur-de-travail',
      'note-avec-caracteres-speciaux-eac',
      'dossier-avec-espaces-multiples'
    ];
    
    for (const ref of testRefs) {
      console.log(`🔍 Résolution de "${ref}" -> [SIMULATION: ID résolu]`);
    }
    
    console.log('');
    console.log('✅ Tests terminés !');
    console.log('');
    console.log('📋 Prochaines étapes:');
    console.log('1. Exécutez la migration SQL dans Supabase');
    console.log('2. Lancez: npm run migrate-slugs');
    console.log('3. Testez les endpoints avec des slugs');
    
  } catch (err) {
    console.error('❌ Erreur lors des tests:', err);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  testSlugGeneration();
}

export { testSlugGeneration }; 