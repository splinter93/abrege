import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
// import.*logger.*from '@/utils/logger';

// Charger les variables d'environnement depuis .env
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// // const supabase = [^;]+;]+;

// 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";

async function checkTableStructure(tableName: string) {
  logger.dev(`\n🔍 Vérification de la table ${tableName}...`);
  
  try {
    // Vérifier si la colonne slug existe
    const { data: _testData, error: testError } = await supabase
      .from(tableName)
      .select('slug')
      .limit(1);
    
    if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
      logger.dev(`❌ La colonne slug n'existe pas dans la table ${tableName}`);
      return false;
    } else {
      logger.dev(`✅ La colonne slug existe dans la table ${tableName}`);
      
      // Compter les enregistrements avec et sans slug
      const { data: withSlug } = await supabase
        .from(tableName)
        .select('id')
        .not('slug', 'is', null);
      
      const { data: withoutSlug } = await supabase
        .from(tableName)
        .select('id')
        .is('slug', null);
      
      logger.dev(`📊 ${tableName}: ${withSlug?.length || 0} avec slug, ${withoutSlug?.length || 0} sans slug`);
      
      return true;
    }
  } catch (error) {
    logger.error(`❌ Erreur lors de la vérification de ${tableName}:`, error);
    return false;
  }
}

async function checkIndexes() {
  logger.dev('\n🔍 Vérification des index uniques...');
  
  try {
    // Test de contrainte d'unicité sur articles
    const { data: articlesTest } = await supabase
      .from('articles')
      .select('slug, user_id')
      .not('slug', 'is', null)
      .limit(10);
    
    if (articlesTest) {
      const uniqueSlugs = new Set(articlesTest.map(a => `${a.slug}-${a.user_id}`));
      logger.dev(`✅ Index articles: ${articlesTest.length} enregistrements, ${uniqueSlugs.size} combinaisons uniques`);
    }
    
    // Test de contrainte d'unicité sur folders
    const { data: foldersTest } = await supabase
      .from('folders')
      .select('slug, user_id')
      .not('slug', 'is', null)
      .limit(10);
    
    if (foldersTest) {
      const uniqueSlugs = new Set(foldersTest.map(f => `${f.slug}-${f.user_id}`));
      logger.dev(`✅ Index folders: ${foldersTest.length} enregistrements, ${uniqueSlugs.size} combinaisons uniques`);
    }
    
    // Test de contrainte d'unicité sur classeurs
    const { data: classeursTest } = await supabase
      .from('classeurs')
      .select('slug, user_id')
      .not('slug', 'is', null)
      .limit(10);
    
    if (classeursTest) {
      const uniqueSlugs = new Set(classeursTest.map(c => `${c.slug}-${c.user_id}`));
      logger.dev(`✅ Index classeurs: ${classeursTest.length} enregistrements, ${uniqueSlugs.size} combinaisons uniques`);
    }
    
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification des index:', error);
  }
}

async function checkSampleData() {
  logger.dev('\n📊 Vérification des données d\'exemple...');
  
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

    logger.dev('\n📝 Exemples de notes:');
    notes?.forEach(note => {
      logger.dev(`  - ID: ${note.id}, Slug: ${note.slug}, Titre: ${note.source_title}`);
    });

    logger.dev('\n📁 Exemples de dossiers:');
    folders?.forEach(folder => {
      logger.dev(`  - ID: ${folder.id}, Slug: ${folder.slug}, Nom: ${folder.name}`);
    });

    logger.dev('\n📚 Exemples de classeurs:');
    classeurs?.forEach(classeur => {
      logger.dev(`  - ID: ${classeur.id}, Slug: ${classeur.slug}, Nom: ${classeur.name}`);
    });

    return { notes, folders, classeurs };
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification des données:', error);
    return { notes: [], folders: [], classeurs: [] };
  }
}

async function testSlugGeneration() {
  logger.dev('\n🧪 Test de génération de slugs...');
  
  try {
    // Test avec un titre simple
    const testTitle = 'Test Slug Generation 2024';
    const expectedSlug = 'test-slug-generation-2024';
    
    logger.dev(`📝 Test: "${testTitle}" -> "${expectedSlug}"`);
    
    // Vérifier si ce slug existe déjà
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', expectedSlug)
      .eq('user_id', USER_ID);
    
    if (existing && existing.length > 0) {
      logger.dev(`⚠️  Le slug "${expectedSlug}" existe déjà`);
    } else {
      logger.dev(`✅ Le slug "${expectedSlug}" est disponible`);
    }
    
  } catch (error) {
    logger.error('❌ Erreur lors du test de génération:', error);
  }
}

async function main() {
  logger.dev('🔍 Vérification complète de la base de données');
  logger.dev('=============================================');
  logger.dev(`👤 USER_ID: ${USER_ID}`);
  logger.dev(`🌐 Supabase URL: ${supabaseUrl}`);
  
  try {
    // Vérifier la structure des tables
    const articlesOk = await checkTableStructure('articles');
    const foldersOk = await checkTableStructure('folders');
    const classeursOk = await checkTableStructure('classeurs');
    
    // Vérifier les index
    await checkIndexes();
    
    // Vérifier les données d'exemple
    // const _sampleData = [^;]+;
    
    // Test de génération de slugs
    await testSlugGeneration();
    
    // Résumé
    logger.dev('\n📋 Résumé de la vérification:');
    logger.dev(`- Articles: ${articlesOk ? '✅' : '❌'}`);
    logger.dev(`- Folders: ${foldersOk ? '✅' : '❌'}`);
    logger.dev(`- Classeurs: ${classeursOk ? '✅' : '❌'}`);
    
    if (articlesOk && foldersOk && classeursOk) {
      logger.dev('\n🎉 Base de données prête pour l\'API LLM-friendly !');
      logger.dev('\n📋 Prochaines étapes:');
      logger.dev('1. Lancer: npm run migrate-slugs (si des données sans slug)');
      logger.dev('2. Lancer: npm run test-endpoints (pour tester l\'API)');
      logger.dev('3. Utiliser le guide Donna pour tester manuellement');
    } else {
      logger.dev('\n⚠️  Problèmes détectés !');
      logger.dev('📋 Actions requises:');
      logger.dev('1. Exécuter la migration SQL dans Supabase Dashboard');
      logger.dev('2. Relancer: npm run add-slug-columns');
      logger.dev('3. Lancer: npm run migrate-slugs');
    }
    
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

export { main as verifyDatabase }; 