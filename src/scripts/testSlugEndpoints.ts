import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

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

// URL de base pour les tests
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

async function testEndpoint(method: string, endpoint: string, data?: any, description?: string) {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  logger.dev(`\n🔍 Test: ${method} ${endpoint}`);
  if (description) logger.dev(`📝 Description: ${description}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();
    
    if (response.ok) {
      logger.dev(`✅ Succès (${response.status}): ${JSON.stringify(responseData, null, 2)}`);
      return { success: true, data: responseData };
    } else {
      logger.dev(`❌ Erreur (${response.status}): ${JSON.stringify(responseData, null, 2)}`);
      return { success: false, error: responseData };
    }
  } catch (error) {
    logger.dev(`❌ Exception: ${error}`);
    return { success: false, error };
  }
}

async function testSlugResolution() {
  logger.dev('\n🎯 Test de résolution des slugs...');
  
  // Récupérer quelques exemples de chaque type
  const { data: notes } = await supabase
    .from('articles')
    .select('id, slug, source_title')
    .eq('user_id', USER_ID)
    .not('slug', 'is', null)
    .limit(2);

  const { data: folders } = await supabase
    .from('folders')
    .select('id, slug, name')
    .eq('user_id', USER_ID)
    .not('slug', 'is', null)
    .limit(2);

  const { data: classeurs } = await supabase
    .from('classeurs')
    .select('id, slug, name')
    .eq('user_id', USER_ID)
    .not('slug', 'is', null)
    .limit(2);

  logger.dev('\n📝 Notes disponibles:', notes?.map(n => ({ id: n.id, slug: n.slug, title: n.source_title })));
  logger.dev('📁 Dossiers disponibles:', folders?.map(f => ({ id: f.id, slug: f.slug, name: f.name })));
  logger.dev('📚 Classeurs disponibles:', classeurs?.map(c => ({ id: c.id, slug: c.slug, name: c.name })));

  return { notes, folders, classeurs };
}

async function testCreateEndpoints() {
  logger.dev('\n🚀 Test des endpoints de création...');
  
  // Test création de note
  await testEndpoint('POST', '/note/create', {
    source_title: 'Test Note LLM-Friendly',
    markdown_content: '# Test Note\n\nContenu de test pour vérifier que l\'API fonctionne.'
  }, 'Créer une nouvelle note');

  // Test création de dossier
  await testEndpoint('POST', '/folder/create', {
    name: 'Test Folder LLM-Friendly',
    classeur_id: '0ea859bd-9567-4b0e-98aa-7021fa4fd34a' // ID du classeur "Notes"
  }, 'Créer un nouveau dossier');

  // Test création de notebook
  await testEndpoint('POST', '/notebook/create', {
    name: 'Test Notebook LLM-Friendly'
  }, 'Créer un nouveau notebook');
}

async function testListEndpoints() {
  logger.dev('\n📋 Test des endpoints de liste...');
  
  // Test liste des notebooks
  await testEndpoint('GET', '/notebooks', undefined, 'Lister tous les notebooks');
}

async function testSlugEndpoints(samples: any) {
  logger.dev('\n🔗 Test des endpoints avec slugs...');
  
  if (samples.notes && samples.notes.length > 0) {
    const note = samples.notes[0];
    
    // Test avec slug
    await testEndpoint('GET', `/note/${note.slug}/information`, undefined, 
      `Récupérer les informations d'une note par slug: ${note.slug}`);
    
    // Test avec ID
    await testEndpoint('GET', `/note/${note.id}/information`, undefined, 
      `Récupérer les informations d'une note par ID: ${note.id}`);
  }

  if (samples.folders && samples.folders.length > 0) {
    const folder = samples.folders[0];
    
    // Test avec slug
    await testEndpoint('GET', `/folder/${folder.slug}`, undefined, 
      `Récupérer un dossier par slug: ${folder.slug}`);
    
    // Test avec ID
    await testEndpoint('GET', `/folder/${folder.id}`, undefined, 
      `Récupérer un dossier par ID: ${folder.id}`);
  }

  if (samples.classeurs && samples.classeurs.length > 0) {
    const classeur = samples.classeurs[0];
    
    // Test avec slug
    await testEndpoint('GET', `/notebook/${classeur.slug}`, undefined, 
      `Récupérer un notebook par slug: ${classeur.slug}`);
    
    // Test avec ID
    await testEndpoint('GET', `/notebook/${classeur.id}`, undefined, 
      `Récupérer un notebook par ID: ${classeur.id}`);
  }
}

async function testContentEndpoints(samples: any) {
  logger.dev('\n📄 Test des endpoints de contenu...');
  
  if (samples.notes && samples.notes.length > 0) {
    const note = samples.notes[0];
    
    // Test ajout de contenu
    await testEndpoint('POST', `/note/${note.slug}/add-content`, {
      markdown_content: '\n\n## Nouveau contenu ajouté\n\nCe contenu a été ajouté via l\'API LLM-friendly.'
    }, `Ajouter du contenu à une note par slug: ${note.slug}`);
    
    // Test table des matières
    await testEndpoint('GET', `/note/${note.slug}/table-of-contents`, undefined, 
      `Récupérer la table des matières par slug: ${note.slug}`);
  }
}

async function main() {
  logger.dev('🧪 Test complet de l\'API LLM-Friendly');
  logger.dev('=====================================');
  logger.dev(`🌐 URL de base: ${BASE_URL}`);
  logger.dev(`👤 USER_ID: ${USER_ID}`);
  
  try {
    // Test de résolution des slugs
    const samples = await testSlugResolution();
    
    // Test des endpoints de création
    await testCreateEndpoints();
    
    // Test des endpoints de liste
    await testListEndpoints();
    
    // Test des endpoints avec slugs
    await testSlugEndpoints(samples);
    
    // Test des endpoints de contenu
    await testContentEndpoints(samples);
    
    logger.dev('\n🎉 Tests terminés !');
    logger.dev('\n📋 Résumé:');
    logger.dev('- ✅ Endpoints de création testés');
    logger.dev('- ✅ Endpoints de liste testés');
    logger.dev('- ✅ Résolution de slugs testée');
    logger.dev('- ✅ Endpoints de contenu testés');
    
  } catch (error) {
    logger.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

export { main as testSlugEndpoints }; 