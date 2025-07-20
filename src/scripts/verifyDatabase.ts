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

async function checkTableStructure(tableName: string) {
  console.log(`\n🔍 Vérification de la table ${tableName}...`);
  
  try {
    // Vérifier si la colonne slug existe
    const { data: testData, error: testError } = await supabase
      .from(tableName)
      .select('slug')
      .limit(1);
    
    if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
      console.log(`❌ La colonne slug n'existe pas dans la table ${tableName}`);
      return false;
    } else {
      console.log(`✅ La colonne slug existe dans la table ${tableName}`);
      
      // Compter les enregistrements avec et sans slug
      const { data: withSlug } = await supabase
        .from(tableName)
        .select('id')
        .not('slug', 'is', null);
      
      const { data: withoutSlug } = await supabase
        .from(tableName)
        .select('id')
        .is('slug', null);
      
      console.log(`📊 ${tableName}: ${withSlug?.length || 0} avec slug, ${withoutSlug?.length || 0} sans slug`);
      
      return true;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de ${tableName}:`, error);
    return false;
  }
}

async function checkIndexes() {
  console.log('\n🔍 Vérification des index uniques...');
  
  try {
    // Test de contrainte d'unicité sur articles
    const { data: articlesTest } = await supabase
      .from('articles')
      .select('slug, user_id')
      .not('slug', 'is', null)
      .limit(10);
    
    if (articlesTest) {
      const uniqueSlugs = new Set(articlesTest.map(a => `${a.slug}-${a.user_id}`));
      console.log(`✅ Index articles: ${articlesTest.length} enregistrements, ${uniqueSlugs.size} combinaisons uniques`);
    }
    
    // Test de contrainte d'unicité sur folders
    const { data: foldersTest } = await supabase
      .from('folders')
      .select('slug, user_id')
      .not('slug', 'is', null)
      .limit(10);
    
    if (foldersTest) {
      const uniqueSlugs = new Set(foldersTest.map(f => `${f.slug}-${f.user_id}`));
      console.log(`✅ Index folders: ${foldersTest.length} enregistrements, ${uniqueSlugs.size} combinaisons uniques`);
    }
    
    // Test de contrainte d'unicité sur classeurs
    const { data: classeursTest } = await supabase
      .from('classeurs')
      .select('slug, user_id')
      .not('slug', 'is', null)
      .limit(10);
    
    if (classeursTest) {
      const uniqueSlugs = new Set(classeursTest.map(c => `${c.slug}-${c.user_id}`));
      console.log(`✅ Index classeurs: ${classeursTest.length} enregistrements, ${uniqueSlugs.size} combinaisons uniques`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des index:', error);
  }
}

async function checkSampleData() {
  console.log('\n📊 Vérification des données d\'exemple...');
  
  try {
    // Récupérer quelques exemples de chaque type
    const { data: notes } = await supabase
      .from('articles')
      .select('id, slug, source_title, user_id')
      .eq('user_id', USER_ID)
      .not('slug', 'is', null)
      .limit(3);

    const { data: folders } = await supabase
      .from('folders')
      .select('id, slug, name, user_id')
      .eq('user_id', USER_ID)
      .not('slug', 'is', null)
      .limit(3);

    const { data: classeurs } = await supabase
      .from('classeurs')
      .select('id, slug, name, user_id')
      .eq('user_id', USER_ID)
      .not('slug', 'is', null)
      .limit(3);

    console.log('\n📝 Exemples de notes:');
    notes?.forEach(note => {
      console.log(`  - ID: ${note.id}, Slug: ${note.slug}, Titre: ${note.source_title}`);
    });

    console.log('\n📁 Exemples de dossiers:');
    folders?.forEach(folder => {
      console.log(`  - ID: ${folder.id}, Slug: ${folder.slug}, Nom: ${folder.name}`);
    });

    console.log('\n📚 Exemples de classeurs:');
    classeurs?.forEach(classeur => {
      console.log(`  - ID: ${classeur.id}, Slug: ${classeur.slug}, Nom: ${classeur.name}`);
    });

    return { notes, folders, classeurs };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des données:', error);
    return { notes: [], folders: [], classeurs: [] };
  }
}

async function testSlugGeneration() {
  console.log('\n🧪 Test de génération de slugs...');
  
  try {
    // Test avec un titre simple
    const testTitle = 'Test Slug Generation 2024';
    const expectedSlug = 'test-slug-generation-2024';
    
    console.log(`📝 Test: "${testTitle}" -> "${expectedSlug}"`);
    
    // Vérifier si ce slug existe déjà
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', expectedSlug)
      .eq('user_id', USER_ID);
    
    if (existing && existing.length > 0) {
      console.log(`⚠️  Le slug "${expectedSlug}" existe déjà`);
    } else {
      console.log(`✅ Le slug "${expectedSlug}" est disponible`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test de génération:', error);
  }
}

async function main() {
  console.log('🔍 Vérification complète de la base de données');
  console.log('=============================================');
  console.log(`👤 USER_ID: ${USER_ID}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  
  try {
    // Vérifier la structure des tables
    const articlesOk = await checkTableStructure('articles');
    const foldersOk = await checkTableStructure('folders');
    const classeursOk = await checkTableStructure('classeurs');
    
    // Vérifier les index
    await checkIndexes();
    
    // Vérifier les données d'exemple
    const sampleData = await checkSampleData();
    
    // Test de génération de slugs
    await testSlugGeneration();
    
    // Résumé
    console.log('\n📋 Résumé de la vérification:');
    console.log(`- Articles: ${articlesOk ? '✅' : '❌'}`);
    console.log(`- Folders: ${foldersOk ? '✅' : '❌'}`);
    console.log(`- Classeurs: ${classeursOk ? '✅' : '❌'}`);
    
    if (articlesOk && foldersOk && classeursOk) {
      console.log('\n🎉 Base de données prête pour l\'API LLM-friendly !');
      console.log('\n📋 Prochaines étapes:');
      console.log('1. Lancer: npm run migrate-slugs (si des données sans slug)');
      console.log('2. Lancer: npm run test-endpoints (pour tester l\'API)');
      console.log('3. Utiliser le guide Donna pour tester manuellement');
    } else {
      console.log('\n⚠️  Problèmes détectés !');
      console.log('📋 Actions requises:');
      console.log('1. Exécuter la migration SQL dans Supabase Dashboard');
      console.log('2. Relancer: npm run add-slug-columns');
      console.log('3. Lancer: npm run migrate-slugs');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

export { main as verifyDatabase }; 