#!/usr/bin/env tsx

/**
 * Script de test simple pour valider l'intégration du schéma OpenAPI V2
 * Sans dépendances Supabase
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function testOpenAPISimple() {
  console.log('🧪 Test simple d\'intégration OpenAPI V2\n');

  try {
    // 1. Test de lecture du schéma
    console.log('1️⃣ Test de lecture du schéma OpenAPI V2...');
    const schemaPath = join(process.cwd(), 'openapi-v2-schema.json');
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    console.log(`✅ Schéma lu: ${schema.info.title} v${schema.info.version}`);
    console.log(`📊 ${Object.keys(schema.paths).length} endpoints disponibles`);
    console.log(`🏷️ ${schema.tags.length} tags disponibles`);
    
    // 2. Test de génération des tools (simulation)
    console.log('\n2️⃣ Test de génération des tools...');
    
    const tools: any[] = [];
    const endpoints = Object.keys(schema.paths);
    
    endpoints.forEach(endpoint => {
      const path = schema.paths[endpoint];
      const methods = Object.keys(path);
      
      methods.forEach(method => {
        const operation = path[method];
        
        // Vérifier si c'est un endpoint utile
        const usefulEndpoints = [
          '/note/create',
          '/note/{ref}',
          '/note/{ref}/update',
          '/note/{ref}/delete',
          '/note/{ref}/move',
          '/note/{ref}/add-content',
          '/classeur/create',
          '/classeurs',
          '/folder/create',
          '/search',
          '/me',
          '/stats'
        ];
        
        const isUseful = usefulEndpoints.some(usefulEndpoint => 
          endpoint.includes(usefulEndpoint.replace('{ref}', ''))
        );
        
        if (isUseful) {
          // Générer un nom de tool
          let toolName = endpoint
            .replace(/^\/api\/v2\//, '')
            .replace(/\/\{([^}]+)\}/g, '_$1')
            .replace(/\//g, '_')
            .replace(/^_/, '')
            .replace(/_+/g, '_');
          
          toolName = `${method.toLowerCase()}_${toolName}`;
          
          // Mappings pour des noms plus lisibles
          const nameMappings: Record<string, string> = {
            'post_note_create': 'create_note',
            'get_note_ref': 'get_note',
            'put_note_ref_update': 'update_note',
            'delete_note_ref_delete': 'delete_note',
            'patch_note_ref_add-content': 'add_content_to_note',
            'put_note_ref_move': 'move_note',
            'post_classeur_create': 'create_classeur',
            'get_classeurs': 'list_classeurs',
            'post_folder_create': 'create_folder',
            'get_search': 'search_notes',
            'get_me': 'get_user_info',
            'get_stats': 'get_platform_stats'
          };
          
          const finalToolName = nameMappings[toolName] || toolName;
          
          tools.push({
            name: finalToolName,
            description: operation.summary || operation.description || `${method.toUpperCase()} operation on ${endpoint}`,
            endpoint,
            method: method.toUpperCase()
          });
        }
      });
    });
    
    console.log(`✅ ${tools.length} tools générés`);
    console.log('📋 Liste des tools:');
    tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description.substring(0, 60)}...`);
    });
    
    // 3. Test de recherche d'endpoints
    console.log('\n3️⃣ Test de recherche d\'endpoints...');
    const noteEndpoints = endpoints.filter(endpoint => 
      endpoint.toLowerCase().includes('note')
    );
    console.log(`📝 ${noteEndpoints.length} endpoints liés aux notes:`);
    noteEndpoints.slice(0, 5).forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
    
    const classeurEndpoints = endpoints.filter(endpoint => 
      endpoint.toLowerCase().includes('classeur')
    );
    console.log(`📚 ${classeurEndpoints.length} endpoints liés aux classeurs:`);
    classeurEndpoints.slice(0, 3).forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
    
    // 4. Test des schémas de composants
    console.log('\n4️⃣ Test des schémas de composants...');
    const schemas = Object.keys(schema.components.schemas);
    console.log(`📋 ${schemas.length} schémas de composants disponibles`);
    console.log('🔍 Premiers schémas:');
    schemas.slice(0, 10).forEach(schemaName => {
      console.log(`   - ${schemaName}`);
    });
    
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('\n📊 Résumé:');
    console.log(`   - Schéma: ${schema.info.title} v${schema.info.version}`);
    console.log(`   - Endpoints: ${endpoints.length}`);
    console.log(`   - Tools générés: ${tools.length}`);
    console.log(`   - Schémas: ${schemas.length}`);
    console.log(`   - Tags: ${schema.tags.length}`);
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  testOpenAPISimple().catch(console.error);
}

export { testOpenAPISimple };
