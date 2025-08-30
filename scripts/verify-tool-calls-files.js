#!/usr/bin/env node

/**
 * 🔍 Script de vérification des fichiers liés aux tool calls
 * 
 * Ce script vérifie l'existence de tous les fichiers listés dans
 * la documentation des tool calls et injection d'historique.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DES FICHIERS TOOL CALLS');
console.log('========================================\n');

// Liste complète des fichiers à vérifier
const FILES_TO_CHECK = {
  'Core Services - Gestion des Tool Calls': [
    'src/services/llm/groqGptOss120b.ts',
    'src/services/llm/services/GroqOrchestrator.ts',
    'src/services/llm/services/GroqRoundFSM.ts',
    'src/services/llm/services/GroqHistoryBuilder.ts',
    'src/services/llm/services/GroqToolExecutor.ts',
    'src/services/llm/services/ToolCallPersistenceService.ts',
    'src/services/llm/services/BatchMessageService.ts',
    'src/services/agentApiV2Tools.ts'
  ],
  'Gestion de l\'historique': [
    'src/services/chatHistoryCleaner.ts',
    'src/services/toolCallSyncService.ts',
    'src/services/llm/ThreadBuilder.ts',
    'src/services/llm/services/GroqBatchApiClient.ts'
  ],
  'Persistance et Base de Données': [
    'src/app/api/chat/llm/route.ts',
    'src/app/api/ui/chat-sessions/[id]/messages/route.ts',
    'src/app/api/ui/chat-sessions/[id]/messages/batch/route.ts',
    'src/app/api/ui/chat-sessions/route.ts',
    'src/services/chatSessionService.ts',
    'src/services/sessionSyncService.ts',
    'src/store/useChatStore.ts'
  ],
  'Composants UI et Hooks': [
    'src/components/chat/ChatWidget.tsx',
    'src/components/chat/ChatFullscreenV2.tsx',
    'src/components/chat/ChatSidebar.tsx',
    'src/components/chat/ChatMessage.tsx',
    'src/hooks/useChatResponse.ts',
    'src/hooks/useChatStore.ts',
    'src/hooks/useAppContext.ts'
  ],
  'Providers et Intégrations': [
    'src/services/llm/providers/implementations/groq.ts',
    'src/services/llm/providers/implementations/groqResponses.ts',
    'src/services/llm/providers/BaseProvider.ts',
    'src/services/llm/agentApiV2Tools.d.ts',
    'src/services/llm/agentApiV2Tools.demo.ts',
    'src/services/llm/agentApiV2Tools.test.ts'
  ],
  'Types et Validation': [
    'src/services/llm/types/groqTypes.ts',
    'src/types/chat.ts',
    'src/types/api.ts',
    'src/types/dossiers.ts',
    'src/services/llm/validation/groqSchemas.ts',
    'src/services/llm/validation/__tests__/groqSchemas.integration.test.ts'
  ],
  'Tests et Validation': [
    'src/services/llm/services/__tests__/GroqOrchestrator.integration.test.ts',
    'src/services/llm/services/__tests__/GroqRoundFSM.integration.test.ts',
    'src/services/llm/services/__tests__/GroqBatchApiClient.integration.test.ts',
    'src/components/__tests__/ChatWidget.test.tsx',
    'src/hooks/__tests__/useChatStore.test.ts'
  ],
  'Documentation et Scripts': [
    'MECANISME-TOOL-CALLS-COMPLET.md',
    'MECANISME-INJECTION-TOOL-CALLS.md',
    'MECANISME-INJECTION-TOOLS-CORRIGE.md',
    'CORRECTION-FINALE-TOOL-CALLS.md',
    'CORRECTION-HISTORIQUE-TOOL-CALLS.md',
    'CORRECTION-DUPLICATION-TOOL-CALLS.md',
    'scripts/test-duplication-fix.js',
    'scripts/test-tool-content-format.js',
    'scripts/fix-history-transmission.js'
  ],
  'Configuration': [
    'src/services/llm/providers/config/groqConfig.ts',
    'src/services/llm/providers/config/providerConfig.ts',
    'src/services/llm/tools/toolRegistry.ts',
    'src/services/llm/tools/toolValidator.ts'
  ],
  'Monitoring et Logs': [
    'src/utils/logger.ts',
    'src/services/llm/services/GroqPerformanceMonitor.ts',
    'src/services/llm/metrics/toolCallMetrics.ts',
    'src/services/llm/metrics/performanceMetrics.ts'
  ],
  'Déploiement': [
    'supabase/migrations/20241215_create_files_table.sql',
    'supabase/migrations/20241205_add_slug_columns.sql',
    '.env.example',
    'next.config.js'
  ]
};

// Fonction pour vérifier l'existence d'un fichier
function checkFileExists(filePath) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const exists = fs.existsSync(fullPath);
    const stats = exists ? fs.statSync(fullPath) : null;
    
    return {
      exists,
      path: filePath,
      fullPath,
      size: exists ? stats.size : 0,
      isDirectory: exists ? stats.isDirectory() : false,
      lastModified: exists ? stats.mtime : null
    };
  } catch (error) {
    return {
      exists: false,
      path: filePath,
      error: error.message
    };
  }
}

// Fonction pour formater la taille
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fonction pour formater la date
function formatDate(date) {
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Fonction principale de vérification
async function verifyFiles() {
  console.log('🚀 Démarrage de la vérification...\n');
  
  let totalFiles = 0;
  let existingFiles = 0;
  let missingFiles = 0;
  let totalSize = 0;
  
  const results = {};
  
  for (const [category, files] of Object.entries(FILES_TO_CHECK)) {
    console.log(`📁 ${category.toUpperCase()}`);
    console.log('─'.repeat(category.length + 2));
    
    results[category] = {
      files: [],
      stats: { total: 0, existing: 0, missing: 0, size: 0 }
    };
    
    for (const file of files) {
      totalFiles++;
      const fileInfo = checkFileExists(file);
      
      if (fileInfo.exists) {
        existingFiles++;
        totalSize += fileInfo.size;
        results[category].stats.existing++;
        results[category].stats.size += fileInfo.size;
        
        const status = fileInfo.isDirectory ? '📁' : '📄';
        const size = fileInfo.isDirectory ? 'DIR' : formatFileSize(fileInfo.size);
        const modified = fileInfo.lastModified ? formatDate(fileInfo.lastModified) : 'N/A';
        
        console.log(`  ${status} ${file} (${size}, modifié ${modified})`);
      } else {
        missingFiles++;
        results[category].stats.missing++;
        
        console.log(`  ❌ ${file} - MANQUANT`);
        if (fileInfo.error) {
          console.log(`     Erreur: ${fileInfo.error}`);
        }
      }
      
      results[category].files.push(fileInfo);
      results[category].stats.total++;
    }
    
    console.log(`  📊 ${results[category].stats.existing}/${results[category].stats.total} fichiers trouvés`);
    if (results[category].stats.size > 0) {
      console.log(`  💾 Taille totale: ${formatFileSize(results[category].stats.size)}`);
    }
    console.log('');
  }
  
  // Résumé global
  console.log('📊 RÉSUMÉ GLOBAL');
  console.log('==================');
  console.log(`📁 Total des fichiers vérifiés: ${totalFiles}`);
  console.log(`✅ Fichiers existants: ${existingFiles}`);
  console.log(`❌ Fichiers manquants: ${missingFiles}`);
  console.log(`📈 Taux de présence: ${((existingFiles / totalFiles) * 100).toFixed(1)}%`);
  console.log(`💾 Taille totale: ${formatFileSize(totalSize)}`);
  
  // Fichiers manquants critiques
  if (missingFiles > 0) {
    console.log('\n🚨 FICHIERS MANQUANTS CRITIQUES:');
    console.log('================================');
    
    for (const [category, result] of Object.entries(results)) {
      const missingFiles = result.files.filter(f => !f.exists);
      if (missingFiles.length > 0) {
        console.log(`\n📁 ${category}:`);
        for (const file of missingFiles) {
          console.log(`  ❌ ${file.path}`);
        }
      }
    }
  }
  
  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('====================');
  
  if (missingFiles === 0) {
    console.log('🎉 Tous les fichiers sont présents ! Le système est complet.');
  } else if (missingFiles < 10) {
    console.log('⚠️  Quelques fichiers manquent. Vérifiez la structure du projet.');
  } else {
    console.log('🚨 Nombreux fichiers manquants. Vérifiez l\'installation complète du projet.');
  }
  
  if (existingFiles > 0) {
    console.log(`📚 Consultez la documentation dans docs/LISTE-COMPLETE-FICHIERS-TOOL-CALLS.md`);
    console.log(`🧪 Lancez les tests avec: npm test`);
  }
  
  return {
    totalFiles,
    existingFiles,
    missingFiles,
    totalSize,
    results
  };
}

// Exécuter la vérification si le script est appelé directement
if (require.main === module) {
  verifyFiles().catch(console.error);
}

module.exports = { verifyFiles, checkFileExists, FILES_TO_CHECK }; 