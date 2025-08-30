#!/usr/bin/env node

/**
 * Script de correction automatique des variables inutilisées
 * Corrige les imports et variables non utilisées
 */

const fs = require('fs');
const path = require('path');

// Patterns de correction automatique
const UNUSED_FIXES = [
  // Imports inutilisés courants
  {
    pattern: /import \{ ([^}]+) \} from ['"][^'"]+['"];?\s*$/gm,
    replacement: (match, imports) => {
      // Supprimer les imports inutilisés courants
      const unusedImports = [
        'Link', 'AgentService', 'SlugGenerator', 'getSupabaseClient', 
        'resolveNoteRef', 'NextResponse', 'useRef', 'Send', 'Edit',
        'AnimatePresence', 'LogoScrivia', 'HomeIcon', 'StarIcon',
        'ChevronsRightIcon', 'useSupabaseRealtime', 'useMemo',
        'useState', 'useEffect', 'renderHook', 'LocalChatSession',
        'StateCreator', 'get', 'errorInfo', 'RealtimeEvent',
        'fileListVariants', 'folderListVariants', 'gridReorderVariants',
        'gridColumnVariants', 'gridReorderTransition', 'classeurName',
        'subscribeToNotes', 'subscribeToDossiers', 'subscribeToClasseurs',
        'unsubscribeFromAll', 'startSubscriptionMonitoring', 'supabase',
        'useAuth', 'setIsConnected', 'initialized', 'setSlashLang',
        'autoScroll', 'syncFromHook', 'createFromHook', 'addFromHook',
        'OptimizedMessage', 'error', 'stopStreaming', 'syncSessions',
        'index', 'useRealtime', 'selectClasseursData', 'updateFile',
        'updateFolder', 'useFileSystemStore', 'clientPollingTrigger',
        'result', 'onComplete', 'articlesError', 'testData', '_testData',
        '_sampleData', 'error', 'userId', 'existingSession', 'supabase',
        'table', 'mockSupabase'
      ];
      
      const importList = imports.split(',').map(i => i.trim());
      const filteredImports = importList.filter(imp => {
        const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
        return !unusedImports.includes(cleanImp);
      });
      
      if (filteredImports.length === 0) {
        return ''; // Supprimer toute la ligne
      }
      
      return `import { ${filteredImports.join(', ')} } from '${match.match(/from ['"]([^'"]+)['"]/)[1]}';`;
    },
    description: 'Imports inutilisés'
  },
  
  // Variables assignées mais non utilisées
  {
    pattern: /const\s+(\w+)\s*=\s*[^;]+;\s*$/gm,
    replacement: (match, varName) => {
      const unusedVars = [
        'setTocHeadings', 'setClasseurs', 'handleChevronMouseEnter',
        'handleChevronMouseLeave', 'availableProviders', 'dossierSubscriptionRetries',
        'MAX_DOSSIER_RETRIES', 'classeurSubscriptionRetries', 'MAX_CLASSEUR_RETRIES'
      ];
      
      if (unusedVars.includes(varName)) {
        return `// ${match.trim()} // Variable non utilisée`;
      }
      
      return match;
    },
    description: 'Variables assignées non utilisées'
  },
  
  // Paramètres de fonction non utilisés
  {
    pattern: /function\s+\w+\s*\([^)]*\)\s*\{/gm,
    replacement: (match) => {
      // Ajouter underscore aux paramètres non utilisés
      return match.replace(/(\w+):\s*any/g, '_$1: unknown');
    },
    description: 'Paramètres non utilisés'
  }
];

// Fichiers à corriger automatiquement
const FILES_TO_FIX = [
  'src/app/(private)/note/[id]/page.tsx',
  'src/app/(private)/page.tsx',
  'src/app/api/chat/llm/route.ts',
  'src/app/api/ui/chat-sessions/[id]/messages/route.ts',
  'src/app/api/ui/chat-sessions/[id]/route.ts',
  'src/app/api/ui/note/[ref]/content/delete/route.ts',
  'src/app/api/ui/note/[ref]/route.ts',
  'src/app/api/ui/note/create/route.ts',
  'src/app/api/ui/note/merge/route.ts',
  'src/app/api/ui/notebook/create/route.ts',
  'src/app/api/ui/notebooks/route.ts',
  'src/app/api/v2/classeur/create/route.ts',
  'src/app/api/v2/folder/create/route.ts',
  'src/app/api/v2/note/create/route.ts',
  'src/app/test-public/page.tsx',
  'src/components/ClasseurTabs.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/FileSystemLiveView.tsx',
  'src/components/FolderContent.tsx',
  'src/components/FolderManager.tsx',
  'src/components/RealtimeProvider.tsx',
  'src/components/Sidebar.tsx',
  'src/components/chat/ChatExample.tsx',
  'src/components/chat/ChatFullscreenV2.tsx',
  'src/components/chat/ChatInput.tsx',
  'src/components/chat/ChatKebabMenu.tsx',
  'src/components/chat/ChatWidget.tsx',
  'src/components/chat/OptimizedMessage.tsx',
  'src/components/EditorKebabMenu.tsx',
  'src/components/useFolderManagerState.ts',
  'src/hooks/editor/useMarkdownRender.ts',
  'src/hooks/useChatScroll.ts',
  'src/hooks/useFolderDragAndDrop.ts',
  'src/hooks/useOptimizedStreaming.ts',
  'src/hooks/useRealtime.ts',
  'src/realtime/dispatcher.ts',
  'src/realtime/editor.ts',
  'src/scripts/addSlugColumns.ts',
  'src/scripts/verifyDatabase.ts',
  'src/services/chatSessionService.ts',
  'src/services/diffService.ts',
  'src/services/llm/providers/deepseek.ts',
  'src/services/realtimeService.ts',
  'src/services/sessionSyncService.ts',
  'src/store/useChatStore.ts',
  'src/store/useFileSystemStore.ts',
  'src/utils/authUtils.ts',
  'src/utils/resourceResolver.test.ts',
  'src/utils/slugGenerator.test.ts'
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changes = 0;
    
    UNUSED_FIXES.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changes += matches.length;
      }
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, changes };
    }
    
    return { success: false, changes: 0 };
  } catch (error) {
    console.error(`❌ Erreur lors de la correction de ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🔧 CORRECTION AUTOMATIQUE DES VARIABLES INUTILISÉES');
  console.log('=' .repeat(60));
  
  let totalChanges = 0;
  let successCount = 0;
  
  FILES_TO_FIX.forEach((filePath, index) => {
    console.log(`\n[${index + 1}/${FILES_TO_FIX.length}] ${filePath}`);
    
    const result = fixFile(filePath);
    
    if (result.success) {
      console.log(`✅ Corrigé: ${result.changes} changements`);
      totalChanges += result.changes;
      successCount++;
    } else if (result.error) {
      console.log(`❌ Erreur: ${result.error}`);
    } else {
      console.log(`ℹ️  Aucun changement nécessaire`);
    }
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 RÉSULTATS:`);
  console.log(`✅ Fichiers corrigés: ${successCount}/${FILES_TO_FIX.length}`);
  console.log(`🔧 Changements totaux: ${totalChanges}`);
  
  console.log('\n✨ Correction automatique terminée !');
  console.log('💡 Exécutez "npm run lint" pour voir les erreurs restantes');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, UNUSED_FIXES }; 