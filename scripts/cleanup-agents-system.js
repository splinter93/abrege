#!/usr/bin/env node

/**
 * Script de nettoyage du système Agents & Providers
 * Nettoie les logs, types any, imports inutilisés dans le système LLM
 */

const fs = require('fs');
const path = require('path');

// Fichiers du système agents & providers à nettoyer
const AGENT_SYSTEM_FILES = [
  'src/services/llm/providerManager.ts',
  'src/services/llm/providers/template.ts',
  'src/services/llm/providers/deepseek.ts',
  'src/services/llm/providers/synesia.ts',
  'src/services/llm/types.ts',
  'src/app/api/chat/llm/route.ts',
  'src/store/useChatStore.ts',
  'src/services/agentService.ts',
  'src/components/chat/ChatSidebar.tsx',
  'src/components/chat/ChatKebabMenu.tsx',
  'src/components/chat/ChatFullscreenV2.tsx',
  'src/hooks/useAgents.ts'
];

// Patterns de nettoyage spécifiques au système agents
const AGENT_CLEANUP_PATTERNS = [
  // Logs excessifs dans le système agents
  {
    pattern: /logger\.dev\(`\[([^\]]+)\]\s*([^`]+)`,\s*([^)]+)\)/g,
    replacement: 'logger.dev(`[$1] $2`, $3)',
    description: 'Logs agents formatés'
  },
  {
    pattern: /logger\.dev\(`([^`]+)`\)/g,
    replacement: 'logger.dev(`$1`)',
    description: 'Logs agents simples'
  },
  
  // Types any dans le système agents
  {
    pattern: /config: any/g,
    replacement: 'config: Record<string, unknown>',
    description: 'Config types'
  },
  {
    pattern: /messages: any\[\]/g,
    replacement: 'messages: unknown[]',
    description: 'Messages array types'
  },
  {
    pattern: /payload: any/g,
    replacement: 'payload: unknown',
    description: 'Payload types'
  },
  {
    pattern: /data: any/g,
    replacement: 'data: unknown',
    description: 'Data types'
  },
  
  // Imports inutilisés dans le système agents
  {
    pattern: /import \{ AgentService \} from ['"][^'"]+['"];?\s*$/gm,
    replacement: '',
    description: 'AgentService import inutilisé'
  },
  {
    pattern: /import \{ LLMProvider, AppContext, ChatMessage \} from ['"][^'"]+['"];?\s*$/gm,
    replacement: '',
    description: 'Imports inutilisés dans providers'
  }
];

function cleanAgentSystemFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changes = 0;
    
    AGENT_CLEANUP_PATTERNS.forEach(({ pattern, replacement, description }) => {
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
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🧹 NETTOYAGE SYSTÈME AGENTS & PROVIDERS');
  console.log('=' .repeat(60));
  
  let totalChanges = 0;
  let successCount = 0;
  
  AGENT_SYSTEM_FILES.forEach((filePath, index) => {
    console.log(`\n[${index + 1}/${AGENT_SYSTEM_FILES.length}] ${filePath}`);
    
    const result = cleanAgentSystemFile(filePath);
    
    if (result.success) {
      console.log(`✅ Nettoyé: ${result.changes} changements`);
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
  console.log(`✅ Fichiers nettoyés: ${successCount}/${AGENT_SYSTEM_FILES.length}`);
  console.log(`🔧 Changements totaux: ${totalChanges}`);
  
  console.log('\n✨ Nettoyage système agents terminé !');
}

if (require.main === module) {
  main();
}

module.exports = { cleanAgentSystemFile, AGENT_SYSTEM_FILES }; 