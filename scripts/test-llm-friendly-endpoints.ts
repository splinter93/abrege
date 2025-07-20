#!/usr/bin/env tsx

/**
 * Script de test pour les nouveaux endpoints LLM-friendly
 * Vérifie que tous les nouveaux noms d'endpoints fonctionnent correctement
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
const BASE_URL = "http://localhost:3000/api/v1";

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
}

async function testEndpoint(
  endpoint: string, 
  method: string = 'GET', 
  body?: any
): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Test des endpoints LLM-friendly...\n');

  const tests: Array<{ endpoint: string; method: string; body?: any; description: string }> = [
    // Tests de création
    {
      endpoint: '/note/create',
      method: 'POST',
      body: {
        source_title: 'Test Note LLM-Friendly',
        markdown_content: '# Test\n\nContenu de test pour les nouveaux endpoints.',
        folder_id: null,
        classeur_id: null
      },
      description: 'Créer une note avec le nouveau nom'
    },
    {
      endpoint: '/folder/create',
      method: 'POST',
      body: {
        name: 'Test Folder LLM-Friendly',
        classeur_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      },
      description: 'Créer un dossier avec le nouveau nom'
    },
    {
      endpoint: '/notebook/create',
      method: 'POST',
      body: {
        name: 'Test Notebook LLM-Friendly',
        emoji: '📚',
        color: '#3b82f6'
      },
      description: 'Créer un classeur avec le nouveau nom'
    },
    {
      endpoint: '/note/overwrite',
      method: 'POST',
      body: {
        note_id: '123e4567-e89b-12d3-a456-426614174000',
        source_title: 'Note Overwritée',
        markdown_content: '# Contenu complètement remplacé\n\nNouveau contenu.'
      },
      description: 'Écraser complètement une note'
    },
    // Tests de récupération
    {
      endpoint: '/note/ma-premiere-note',
      method: 'GET',
      description: 'Récupérer une note par slug'
    },
    {
      endpoint: '/note/ma-premiere-note/table-of-contents',
      method: 'GET',
      description: 'Récupérer la table des matières'
    },
    {
      endpoint: '/note/ma-premiere-note/information',
      method: 'GET',
      description: 'Récupérer les informations de base'
    },
    {
      endpoint: '/note/ma-premiere-note/statistics',
      method: 'GET',
      description: 'Récupérer les statistiques'
    },
    {
      endpoint: '/folder/mon-dossier-important',
      method: 'GET',
      description: 'Récupérer un dossier par slug'
    },
    {
      endpoint: '/notebook/classeur-de-travail',
      method: 'GET',
      description: 'Récupérer un classeur par slug'
    },
    // Tests de modification
    {
      endpoint: '/note/ma-premiere-note/add-content',
      method: 'PATCH',
      body: {
        text: '\n## Nouveau contenu ajouté via LLM-friendly endpoint'
      },
      description: 'Ajouter du contenu à une note'
    },
    {
      endpoint: '/note/ma-premiere-note/add-to-section',
      method: 'PATCH',
      body: {
        section: 'introduction',
        text: '\nNouveau contenu dans la section via LLM-friendly endpoint'
      },
      description: 'Ajouter du contenu à une section'
    },
    {
      endpoint: '/note/ma-premiere-note/clear-section',
      method: 'PATCH',
      body: {
        section: 'introduction'
      },
      description: 'Effacer une section'
    },
    {
      endpoint: '/note/ma-premiere-note/information',
      method: 'PATCH',
      body: {
        source_title: 'Titre mis à jour via LLM-friendly endpoint'
      },
      description: 'Mettre à jour les informations'
    },
    {
      endpoint: '/folder/mon-dossier-important',
      method: 'PUT',
      body: {
        name: 'Dossier mis à jour via LLM-friendly endpoint'
      },
      description: 'Mettre à jour un dossier'
    },
    {
      endpoint: '/notebook/classeur-de-travail',
      method: 'PUT',
      body: {
        name: 'Classeur mis à jour via LLM-friendly endpoint',
        emoji: '📖',
        color: '#ef4444'
      },
      description: 'Mettre à jour un classeur'
    },
    // Tests de suppression
    {
      endpoint: '/note/ma-premiere-note',
      method: 'DELETE',
      description: 'Supprimer une note'
    },
    {
      endpoint: '/folder/mon-dossier-important',
      method: 'DELETE',
      description: 'Supprimer un dossier'
    },
    {
      endpoint: '/notebook/classeur-de-travail',
      method: 'DELETE',
      description: 'Supprimer un classeur'
    },
    // Tests utilitaires
    {
      endpoint: '/slug/generate',
      method: 'POST',
      body: {
        title: 'Test LLM-Friendly Slug Generation: éàç!',
        type: 'note',
        userId: USER_ID
      },
      description: 'Générer un slug'
    }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`🔍 Test: ${test.description}`);
    console.log(`   ${test.method} ${test.endpoint}`);
    
    const result = await testEndpoint(test.endpoint, test.method, test.body);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Succès (${result.status})`);
    } else {
      console.log(`   ❌ Échec (${result.status}): ${result.error}`);
    }
    console.log('');
  }

  // Résumé
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('📊 Résumé des tests:');
  console.log(`   ✅ Succès: ${successful}/${total}`);
  console.log(`   ❌ Échecs: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 Tous les endpoints LLM-friendly fonctionnent correctement !');
  } else {
    console.log('\n⚠️  Certains endpoints ont des problèmes. Vérifiez les logs ci-dessus.');
  }

  // Liste des nouveaux noms d'endpoints
  console.log('\n📋 Nouveaux noms d\'endpoints LLM-friendly:');
  console.log('   • /note/create (au lieu de /create-note)');
  console.log('   • /note/overwrite (au lieu de /erase-note)');
  console.log('   • /note/{ref}/add-content (au lieu de /append)');
  console.log('   • /note/{ref}/add-to-section (au lieu de /append-to-section)');
  console.log('   • /note/{ref}/clear-section (au lieu de /erase-section)');
  console.log('   • /note/{ref}/table-of-contents (au lieu de /toc)');
  console.log('   • /note/{ref}/information (au lieu de /meta)');
  console.log('   • /note/{ref}/statistics (au lieu de /metadata)');
  console.log('   • /folder/create (au lieu de /create-folder)');
  console.log('   • /folder/{ref} (au lieu de /dossier/{ref})');
  console.log('   • /notebook/create (au lieu de /create-classeur)');
  console.log('   • /notebook/{ref} (au lieu de /classeur/{ref})');
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests }; 