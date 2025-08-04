import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

// Charger les variables d'environnement depuis .env
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addSlugColumns() {
  logger.dev('🚀 Ajout des colonnes slug aux tables...');
  logger.dev('=====================================');
  
  try {
    // Ajouter la colonne slug à la table articles
    logger.dev('📝 Ajout de la colonne slug à la table articles...');
            const { error: articlesError } = await supabase
      .from('articles')
      .select('id')
      .limit(1);
    
    // Vérifier si la colonne existe déjà en essayant de la sélectionner
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('slug')
      .limit(1);
    
    if (testError && testError.message.includes('column articles.slug does not exist')) {
      logger.dev('⚠️  La colonne slug n\'existe pas encore dans la table articles');
      logger.dev('💡 Veuillez exécuter la migration SQL manuellement dans Supabase');
      logger.dev('📄 Fichier: supabase/migrations/20241205_add_slug_columns.sql');
    } else {
      logger.dev('✅ La colonne slug existe déjà dans la table articles');
    }
    
    // Vérifier la table folders
    logger.dev('📁 Vérification de la colonne slug dans la table folders...');
    const { error: foldersTestError } = await supabase
      .from('folders')
      .select('slug')
      .limit(1);
    
    if (foldersTestError && foldersTestError.message.includes('column folders.slug does not exist')) {
      logger.dev('⚠️  La colonne slug n\'existe pas encore dans la table folders');
    } else {
      logger.dev('✅ La colonne slug existe déjà dans la table folders');
    }
    
    // Vérifier la table classeurs
    logger.dev('📚 Vérification de la colonne slug dans la table classeurs...');
    const { error: classeursTestError } = await supabase
      .from('classeurs')
      .select('slug')
      .limit(1);
    
    if (classeursTestError && classeursTestError.message.includes('column classeurs.slug does not exist')) {
      logger.dev('⚠️  La colonne slug n\'existe pas encore dans la table classeurs');
    } else {
      logger.dev('✅ La colonne slug existe déjà dans la table classeurs');
    }
    
    logger.dev('');
    logger.dev('📋 Instructions pour ajouter les colonnes slug:');
    logger.dev('1. Allez dans votre dashboard Supabase');
    logger.dev('2. Ouvrez l\'éditeur SQL');
    logger.dev('3. Exécutez le contenu du fichier: supabase/migrations/20241205_add_slug_columns.sql');
    logger.dev('4. Relancez ce script: npm run add-slug-columns');
    
  } catch (err) {
    logger.error('❌ Erreur lors de la vérification des colonnes slug:', err);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  addSlugColumns();
}

export { addSlugColumns }; 