#!/usr/bin/env node

/**
 * Script pour générer les tests manquants pour l'API V2
 * Usage: node scripts/generate-api-tests.js
 */

const fs = require('fs');
const path = require('path');

// Configuration des endpoints V2
const V2_ENDPOINTS = [
  {
    path: 'src/app/api/v2/note/[ref]/content/route.ts',
    testPath: 'src/app/api/v2/note/[ref]/content/route.test.ts',
    methods: ['GET'],
    description: 'Note Content V2'
  },
  {
    path: 'src/app/api/v2/note/[ref]/update/route.ts',
    testPath: 'src/app/api/v2/note/[ref]/update/route.test.ts',
    methods: ['PUT'],
    description: 'Note Update V2'
  },
  {
    path: 'src/app/api/v2/note/[ref]/delete/route.ts',
    testPath: 'src/app/api/v2/note/[ref]/delete/route.test.ts',
    methods: ['DELETE'],
    description: 'Note Delete V2'
  },
  {
    path: 'src/app/api/v2/classeur/[ref]/update/route.ts',
    testPath: 'src/app/api/v2/classeur/[ref]/update/route.test.ts',
    methods: ['PUT'],
    description: 'Classeur Update V2'
  },
  {
    path: 'src/app/api/v2/folder/[ref]/update/route.ts',
    testPath: 'src/app/api/v2/folder/[ref]/update/route.test.ts',
    methods: ['PUT'],
    description: 'Folder Update V2'
  }
];

/**
 * Génère le contenu d'un test
 */
function generateTestContent(endpoint) {
  const routeName = endpoint.path.split('/').pop().replace('.ts', '');
  const method = endpoint.methods[0];
  
  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock des utilitaires V2
vi.mock('@/utils/logger', () => ({
  logApi: vi.fn()
}));

vi.mock('@/utils/v2ResourceResolver', () => ({
  V2ResourceResolver: {
    resolveRef: vi.fn(() => Promise.resolve({ success: true, id: 'test-id' }))
  }
}));

vi.mock('@/utils/authUtils', () => ({
  getAuthenticatedUser: vi.fn(() => Promise.resolve({ 
    success: true, 
    userId: 'test-user-id' 
  })),
  checkUserPermission: vi.fn(() => Promise.resolve({ 
    success: true, 
    hasPermission: true 
  }))
}));

vi.mock('@/utils/v2ValidationSchemas', () => ({
  validatePayload: vi.fn(() => ({ success: true, data: {} })),
  createValidationErrorResponse: vi.fn(() => new Response())
}));

vi.mock('@/services/clientPollingTrigger', () => ({
  clientPollingTrigger: {
    triggerArticlesPolling: vi.fn(),
    triggerClasseursPolling: vi.fn()
  }
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' } }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' } }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

describe('${endpoint.description}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('${method} ${endpoint.path.replace('src/app/api/v2/', '/api/v2/').replace('/route.ts', '')}', () => {
    it('should handle successful ${method.toLowerCase()} request', async () => {
      const request = new NextRequest('http://localhost:3000${endpoint.path.replace('src/app/api/v2/', '/api/v2/').replace('/route.ts', '')}', {
        method: '${method}',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }${method !== 'GET' ? ',\n        body: JSON.stringify({ test: "data" })' : ''}
      });
      
      const { ${method} } = await import('./${routeName}');
      
      const response = await ${method}(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(200);
    });

    it('should handle authentication error', async () => {
      const { getAuthenticatedUser } = await import('@/utils/authUtils');
      getAuthenticatedUser.mockResolvedValueOnce({ 
        success: false, 
        error: 'Token invalide' 
      });

      const request = new NextRequest('http://localhost:3000${endpoint.path.replace('src/app/api/v2/', '/api/v2/').replace('/route.ts', '')}', {
        method: '${method}',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      const { ${method} } = await import('./${routeName}');
      
      const response = await ${method}(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(401);
    });

    it('should handle validation error', async () => {
      const { validatePayload } = await import('@/utils/v2ValidationSchemas');
      validatePayload.mockReturnValueOnce({ 
        success: false, 
        error: 'Validation failed',
        details: ['Invalid data']
      });

      const request = new NextRequest('http://localhost:3000${endpoint.path.replace('src/app/api/v2/', '/api/v2/').replace('/route.ts', '')}', {
        method: '${method}',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invalid: 'data' })
      });
      
      const { ${method} } = await import('./${routeName}');
      
      const response = await ${method}(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(422);
    });

    it('should handle permission error', async () => {
      const { checkUserPermission } = await import('@/utils/authUtils');
      checkUserPermission.mockResolvedValueOnce({ 
        success: true, 
        hasPermission: false 
      });

      const request = new NextRequest('http://localhost:3000${endpoint.path.replace('src/app/api/v2/', '/api/v2/').replace('/route.ts', '')}', {
        method: '${method}',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      
      const { ${method} } = await import('./${routeName}');
      
      const response = await ${method}(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(403);
    });

    it('should handle server error', async () => {
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000${endpoint.path.replace('src/app/api/v2/', '/api/v2/').replace('/route.ts', '')}', {
        method: '${method}',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      
      const { ${method} } = await import('./${routeName}');
      
      const response = await ${method}(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(500);
    });
  });
});
`;
}

/**
 * Génère les tests pour tous les endpoints V2
 */
function generateAllTests() {
  console.log('🚀 Génération des tests pour l\'API V2...\n');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  V2_ENDPOINTS.forEach(endpoint => {
    const testPath = path.resolve(endpoint.testPath);
    const routePath = path.resolve(endpoint.path);
    
    // Vérifier si le fichier de route existe
    if (!fs.existsSync(routePath)) {
      console.log(`⚠️  Route non trouvée: ${endpoint.path}`);
      skippedCount++;
      return;
    }
    
    // Vérifier si le test existe déjà
    if (fs.existsSync(testPath)) {
      console.log(`⏭️  Test déjà existant: ${endpoint.testPath}`);
      skippedCount++;
      return;
    }
    
    // Créer le dossier si nécessaire
    const testDir = path.dirname(testPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Générer le test
    const testContent = generateTestContent(endpoint);
    fs.writeFileSync(testPath, testContent);
    
    console.log(`✅ Test créé: ${endpoint.testPath}`);
    createdCount++;
  });
  
  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Tests créés: ${createdCount}`);
  console.log(`   ⏭️  Tests ignorés: ${skippedCount}`);
  console.log(`   📁 Total endpoints: ${V2_ENDPOINTS.length}`);
  
  if (createdCount > 0) {
    console.log(`\n🎯 Prochaines étapes:`);
    console.log(`   1. Exécuter: npm test`);
    console.log(`   2. Corriger les erreurs de test`);
    console.log(`   3. Ajouter des tests spécifiques selon les besoins`);
  }
}

// Exécuter le script
if (require.main === module) {
  generateAllTests();
}

module.exports = { generateAllTests, V2_ENDPOINTS }; 