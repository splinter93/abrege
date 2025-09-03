#!/usr/bin/env tsx

/**
 * Script d'audit complet pour vérifier tous les tools LLM
 * et leur conformité avec l'API V2
 */

async function auditAllTools() {
  console.log('🔍 AUDIT COMPLET - Tools LLM vs API V2\n');

  try {
    // 1. Récupérer les tools LLM
    console.log('1️⃣ Récupération des tools LLM...');
    const toolsResponse = await fetch('http://localhost:3000/api/v2/tools');
    const toolsData = await toolsResponse.json();
    
    if (!toolsData.success) {
      throw new Error('Erreur lors de la récupération des tools');
    }
    
    const llmTools = toolsData.tools.map((tool: any) => tool.function.name).sort();
    console.log(`✅ ${llmTools.length} tools LLM trouvés`);
    
    // 2. Récupérer les endpoints API V2
    console.log('\n2️⃣ Récupération des endpoints API V2...');
    const schemaResponse = await fetch('http://localhost:3000/api/v2/openapi-schema');
    const schemaData = await schemaResponse.json();
    
    const apiV2Endpoints = Object.keys(schemaData.paths).sort();
    console.log(`✅ ${apiV2Endpoints.length} endpoints API V2 trouvés`);
    
    // 3. Analyser la correspondance
    console.log('\n3️⃣ Analyse de correspondance...');
    
    // Mapping des endpoints vers les tools
    const endpointToToolMapping: Record<string, string> = {
      '/note/create': 'create_note',
      '/note/{ref}': 'get_note',
      '/note/{ref}/update': 'update_note',
      '/note/{ref}/delete': 'delete_note',
      '/note/{ref}/add-content': 'add_content_to_note',
      '/note/{ref}/move': 'move_note',
      '/note/{ref}/table-of-contents': 'get_note_toc',
      '/note/{ref}/statistics': 'get_note_stats',
      '/note/recent': 'get_recent_notes',
      '/classeur/create': 'create_classeur',
      '/classeurs': 'list_classeurs',
      '/classeur/{ref}/tree': 'get_classeur_tree',
      '/folder/create': 'create_folder',
      '/folder/{ref}/tree': 'get_folder_tree',
      '/search': 'search_notes',
      '/files/search': 'search_files',
      '/me': 'get_user_info',
      '/stats': 'get_platform_stats',
      '/delete/{resource}/{ref}': 'delete_resource'
    };
    
    // Tools attendus basés sur les endpoints API V2
    const expectedTools = Object.values(endpointToToolMapping).sort();
    
    // 4. Vérifications
    console.log('\n4️⃣ Vérifications de conformité...');
    
    // Tools manquants
    const missingTools = expectedTools.filter(tool => !llmTools.includes(tool));
    if (missingTools.length > 0) {
      console.log('❌ Tools manquants:');
      missingTools.forEach(tool => console.log(`   - ${tool}`));
    } else {
      console.log('✅ Tous les tools attendus sont présents');
    }
    
    // Tools supplémentaires
    const extraTools = llmTools.filter(tool => !expectedTools.includes(tool));
    if (extraTools.length > 0) {
      console.log('⚠️ Tools supplémentaires (non mappés):');
      extraTools.forEach(tool => console.log(`   - ${tool}`));
    }
    
    // 5. Audit détaillé de chaque tool
    console.log('\n5️⃣ Audit détaillé des tools...');
    
    for (const tool of llmTools) {
      console.log(`\n🔧 Tool: ${tool}`);
      
      const toolData = toolsData.tools.find((t: any) => t.function.name === tool);
      if (!toolData) {
        console.log('   ❌ Données du tool non trouvées');
        continue;
      }
      
      // Vérifier les paramètres
      const params = toolData.function.parameters;
      if (params && params.properties) {
        const paramCount = Object.keys(params.properties).length;
        const requiredCount = params.required ? params.required.length : 0;
        console.log(`   📋 Paramètres: ${paramCount} total, ${requiredCount} requis`);
        
        // Vérifier les paramètres requis
        if (params.required && params.required.length > 0) {
          console.log(`   ✅ Paramètres requis: ${params.required.join(', ')}`);
        } else {
          console.log(`   ⚠️ Aucun paramètre requis`);
        }
      } else {
        console.log('   ❌ Aucun paramètre défini');
      }
      
      // Vérifier la description
      const description = toolData.function.description;
      if (description && description.length > 10) {
        console.log(`   ✅ Description: ${description.substring(0, 60)}...`);
      } else {
        console.log('   ⚠️ Description manquante ou trop courte');
      }
    }
    
    // 6. Résumé
    console.log('\n6️⃣ Résumé de l\'audit...');
    console.log(`📊 Tools LLM: ${llmTools.length}`);
    console.log(`📊 Endpoints API V2: ${apiV2Endpoints.length}`);
    console.log(`📊 Tools attendus: ${expectedTools.length}`);
    console.log(`📊 Tools manquants: ${missingTools.length}`);
    console.log(`📊 Tools supplémentaires: ${extraTools.length}`);
    
    // 7. Recommandations
    console.log('\n7️⃣ Recommandations...');
    
    if (missingTools.length > 0) {
      console.log('🔧 Actions requises:');
      console.log('   - Implémenter les tools manquants');
      console.log('   - Vérifier le mapping des endpoints');
    }
    
    if (extraTools.length > 0) {
      console.log('🔍 Actions suggérées:');
      console.log('   - Vérifier si les tools supplémentaires sont nécessaires');
      console.log('   - Mettre à jour le mapping si nécessaire');
    }
    
    console.log('\n✅ Audit terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'audit:', error);
    process.exit(1);
  }
}

// Exécuter l'audit
if (require.main === module) {
  auditAllTools().catch(console.error);
}

export { auditAllTools };
