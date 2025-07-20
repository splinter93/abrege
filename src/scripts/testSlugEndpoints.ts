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

// URL de base pour les tests
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testEndpoint(method: string, endpoint: string, data?: any, description?: string) {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  console.log(`\n🔍 Test: ${method} ${endpoint}`);
  if (description) console.log(`📝 Description: ${description}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();
    
    if (response.ok) {
      console.log(`✅ Succès (${response.status}): ${JSON.stringify(responseData, null, 2)}`);
      return { success: true, data: responseData };
    } else {
      console.log(`❌ Erreur (${response.status}): ${JSON.stringify(responseData, null, 2)}`);
      return { success: false, error: responseData };
    }
  } catch (error) {
    console.log(`❌ Exception: ${error}`);
    return { success: false, error };
  }
}

async function testSlugResolution() {
  console.log('\n🎯 Test de résolution des slugs...');
  
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

  console.log('\n📝 Notes disponibles:', notes?.map(n => ({ id: n.id, slug: n.slug, title: n.source_title })));
  console.log('📁 Dossiers disponibles:', folders?.map(f => ({ id: f.id, slug: f.slug, name: f.name })));
  console.log('📚 Classeurs disponibles:', classeurs?.map(c => ({ id: c.id, slug: c.slug, name: c.name })));

  return { notes, folders, classeurs };
}

async function testCreateEndpoints() {
  console.log('\n🚀 Test des endpoints de création...');
  
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
  console.log('\n📋 Test des endpoints de liste...');
  
  // Test liste des notebooks
  await testEndpoint('GET', '/notebooks', undefined, 'Lister tous les notebooks');
}

async function testSlugEndpoints(samples: any) {
  console.log('\n🔗 Test des endpoints avec slugs...');
  
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
  console.log('\n📄 Test des endpoints de contenu...');
  
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
  console.log('🧪 Test complet de l\'API LLM-Friendly');
  console.log('=====================================');
  console.log(`🌐 URL de base: ${BASE_URL}`);
  console.log(`👤 USER_ID: ${USER_ID}`);
  
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
    
    console.log('\n🎉 Tests terminés !');
    console.log('\n📋 Résumé:');
    console.log('- ✅ Endpoints de création testés');
    console.log('- ✅ Endpoints de liste testés');
    console.log('- ✅ Résolution de slugs testée');
    console.log('- ✅ Endpoints de contenu testés');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

export { main as testSlugEndpoints }; 