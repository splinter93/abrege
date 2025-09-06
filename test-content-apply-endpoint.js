/**
 * Script de test pour l'endpoint POST /api/v2/note/{ref}/content:apply
 * Teste tous les cas d'usage : headings, regex, positions, ancres
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n🚀 ${method} ${url}`);
  if (body) {
    console.log('📦 Body:', JSON.stringify(body, null, 2));
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { status: 0, error: error.message };
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

async function testContentApplyEndpoint() {
  console.log('🧪 TESTING CONTENT APPLY ENDPOINT');
  console.log('=====================================');

  // 1. Créer une note de test
  console.log('\n📝 1. Création d\'une note de test...');
  const createResult = await makeRequest('/api/v2/note/create', 'POST', {
    source_title: 'Test Content Apply',
    notebook_id: 'test-notebook-id',
    markdown_content: `# Introduction
Ceci est une note de test pour l'endpoint content:apply.

## API Endpoints
Voici la section sur les endpoints API.

### GET /api/v2/notes
Endpoint pour lister les notes.

### POST /api/v2/notes
Endpoint pour créer une note.

## Conclusion
Fin de la note de test.`
  });

  if (createResult.status !== 200) {
    console.error('❌ Échec de création de la note de test');
    return;
  }

  const noteId = createResult.data.note.id;
  console.log(`✅ Note créée avec l'ID: ${noteId}`);

  // 2. Test 1: Insertion par heading
  console.log('\n📝 2. Test insertion par heading...');
  const headingTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-1',
      action: 'insert',
      target: {
        type: 'heading',
        heading: {
          path: ['API', 'Endpoints'],
          level: 3
        }
      },
      where: 'after',
      content: '\n\n### PUT /api/v2/notes/{id}\nEndpoint pour mettre à jour une note.'
    }],
    dry_run: true,
    return: 'diff'
  });

  // 3. Test 2: Remplacement par regex
  console.log('\n📝 3. Test remplacement par regex...');
  const regexTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-2',
      action: 'replace',
      target: {
        type: 'regex',
        regex: {
          pattern: 'GET /api/v2/notes',
          flags: 'g'
        }
      },
      where: 'replace_match',
      content: 'GET /api/v2/notes?limit=100'
    }],
    dry_run: true,
    return: 'content'
  });

  // 4. Test 3: Insertion par position
  console.log('\n📝 4. Test insertion par position...');
  const positionTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-3',
      action: 'insert',
      target: {
        type: 'position',
        position: {
          mode: 'start'
        }
      },
      where: 'at',
      content: '# Test Content Apply\n\n'
    }],
    dry_run: true,
    return: 'diff'
  });

  // 5. Test 4: Insertion par ancre
  console.log('\n📝 5. Test insertion par ancre...');
  const anchorTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-4',
      action: 'insert',
      target: {
        type: 'anchor',
        anchor: {
          name: 'before_first_heading'
        }
      },
      where: 'at',
      content: '<!-- Note de test -->\n\n'
    }],
    dry_run: true,
    return: 'diff'
  });

  // 6. Test 5: Suppression par regex
  console.log('\n📝 6. Test suppression par regex...');
  const deleteTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-5',
      action: 'delete',
      target: {
        type: 'regex',
        regex: {
          pattern: '### POST /api/v2/notes.*?\\n',
          flags: 's'
        }
      },
      where: 'replace_match'
    }],
    dry_run: true,
    return: 'diff'
  });

  // 7. Test 6: Upsert section
  console.log('\n📝 7. Test upsert section...');
  const upsertTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-6',
      action: 'upsert_section',
      target: {
        type: 'heading',
        heading: {
          path: ['Nouvelle Section'],
          level: 2
        }
      },
      where: 'at',
      content: '## Nouvelle Section\n\nContenu de la nouvelle section créée dynamiquement.'
    }],
    dry_run: true,
    return: 'content'
  });

  // 8. Test 7: Opérations multiples
  console.log('\n📝 8. Test opérations multiples...');
  const multipleOpsTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [
      {
        id: 'op-7a',
        action: 'insert',
        target: {
          type: 'anchor',
          anchor: { name: 'doc_end' }
        },
        where: 'at',
        content: '\n\n---\n\n*Note modifiée automatiquement*'
      },
      {
        id: 'op-7b',
        action: 'replace',
        target: {
          type: 'regex',
          regex: {
            pattern: 'Fin de la note de test\\.',
            flags: 'g'
          }
        },
        where: 'replace_match',
        content: 'Fin de la note de test modifiée.'
      }
    ],
    dry_run: true,
    return: 'diff'
  });

  // 9. Test 8: Validation d'erreurs
  console.log('\n📝 9. Test validation d\'erreurs...');
  const errorTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-8',
      action: 'insert',
      target: {
        type: 'regex',
        regex: {
          pattern: '[', // Regex invalide
          flags: 'g'
        }
      },
      where: 'at',
      content: 'Test'
    }],
    dry_run: true
  });

  // 10. Test 9: ETag validation
  console.log('\n📝 10. Test validation ETag...');
  const etagTest = await makeRequest(`/api/v2/note/${noteId}/content:apply`, 'POST', {
    ops: [{
      id: 'op-9',
      action: 'insert',
      target: {
        type: 'anchor',
        anchor: { name: 'doc_end' }
      },
      where: 'at',
      content: '\n\nTest ETag'
    }],
    dry_run: false
  }, {
    'If-Match': 'W/"invalid-etag"'
  });

  console.log('\n✅ Tests terminés !');
}

// ============================================================================
// EXECUTION
// ============================================================================

if (require.main === module) {
  testContentApplyEndpoint().catch(console.error);
}

module.exports = { testContentApplyEndpoint };
