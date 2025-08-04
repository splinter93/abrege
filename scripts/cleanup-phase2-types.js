#!/usr/bin/env node

/**
 * Script de nettoyage Phase 2 : Types Any
 * Analyse et propose des corrections pour les types any
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Types de remplacement pour les patterns courants
const TYPE_REPLACEMENTS = {
  // Middleware patterns
  'params?: any': 'params?: Record<string, string>',
  'error: any': 'error: unknown',
  'handler: (req: NextRequest, params?: any)': 'handler: (req: NextRequest, params?: Record<string, string>)',
  
  // Supabase patterns
  'supabase: any': 'supabase: SupabaseClient',
  'query: any': 'query: SupabaseQueryBuilder',
  'data: any': 'data: unknown',
  'result: any': 'result: unknown',
  
  // Event patterns
  'event: any': 'event: unknown',
  'payload: any': 'payload: unknown',
  'context: any': 'context: unknown',
  
  // API patterns
  'response: any': 'response: unknown',
  'request: any': 'request: unknown',
  'body: any': 'body: unknown',
  
  // Editor patterns
  'editor: any': 'editor: Editor',
  'commands: any': 'commands: Record<string, unknown>',
  
  // Generic patterns
  'args: any[]': 'args: unknown[]',
  '[key: string]: any': '[key: string]: unknown',
  'config: any': 'config: Record<string, unknown>',
  'options: any': 'options: Record<string, unknown>'
};

// Fichiers prioritaires à traiter
const PRIORITY_FILES = [
  'src/services/supabase.ts',
  'src/services/optimizedApi.ts',
  'src/services/llm/providers/template.ts',
  'src/hooks/useRealtime.ts',
  'src/hooks/useChatStreaming.ts',
  'src/components/chat/ChatSidebar.tsx',
  'src/components/EditorToolbar.tsx',
  'src/middleware/auth.ts',
  'src/middleware/rateLimit.ts',
  'src/utils/pagination.ts'
];

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const anyOccurrences = [];
    
    lines.forEach((line, index) => {
      if (line.includes(': any')) {
        anyOccurrences.push({
          line: index + 1,
          content: line.trim(),
          suggested: suggestReplacement(line)
        });
      }
    });
    
    return {
      file: filePath,
      count: anyOccurrences.length,
      occurrences: anyOccurrences
    };
  } catch (error) {
    log(`❌ Erreur lors de l'analyse de ${filePath}: ${error.message}`, 'red');
    return { file: filePath, count: 0, occurrences: [] };
  }
}

function suggestReplacement(line) {
  for (const [pattern, replacement] of Object.entries(TYPE_REPLACEMENTS)) {
    if (line.includes(pattern)) {
      return line.replace(pattern, replacement);
    }
  }
  
  // Suggestions génériques basées sur le contexte
  if (line.includes('error: any')) {
    return line.replace('error: any', 'error: unknown');
  }
  if (line.includes('data: any')) {
    return line.replace('data: any', 'data: unknown');
  }
  if (line.includes('params?: any')) {
    return line.replace('params?: any', 'params?: Record<string, string>');
  }
  
  return line.replace(': any', ': unknown');
}

function createTypeDefinitions() {
  const typeDefs = `
// Types génériques pour remplacer 'any'
export type ApiResponse<T = unknown> = {
  data: T;
  error?: string;
  status: number;
};

export type SupabaseQueryResult<T = unknown> = {
  data: T[] | null;
  error: any;
  count: number | null;
};

export type EventPayload = {
  type: string;
  payload: unknown;
  timestamp: number;
};

export type RealtimeEvent = {
  event: string;
  payload: unknown;
  timestamp: number;
};

export type ApiHandler = (
  req: NextRequest, 
  params?: Record<string, string>
) => Promise<Response>;

export type ErrorHandler = (error: unknown) => void;

export type ConfigObject = Record<string, unknown>;

export type EventHandler = (event: unknown) => void;
`;

  return typeDefs;
}

function main() {
  log('🎯 PHASE 2 : NETTOYAGE DES TYPES ANY', 'magenta');
  log('=' .repeat(60), 'cyan');
  
  // Analyser les fichiers prioritaires
  log('\n📊 ANALYSE DES FICHIERS PRIORITAIRES', 'blue');
  
  let totalAny = 0;
  const results = [];
  
  PRIORITY_FILES.forEach((filePath, index) => {
    log(`\n[${index + 1}/${PRIORITY_FILES.length}] ${filePath}`, 'yellow');
    
    const analysis = analyzeFile(filePath);
    totalAny += analysis.count;
    results.push(analysis);
    
    if (analysis.count > 0) {
      log(`  📝 ${analysis.count} types 'any' trouvés`, 'red');
      
      // Afficher les suggestions pour les 3 premiers
      analysis.occurrences.slice(0, 3).forEach((occ, i) => {
        log(`    ${i + 1}. Ligne ${occ.line}:`, 'cyan');
        log(`       AVANT: ${occ.content}`, 'red');
        log(`       APRÈS: ${occ.suggested}`, 'green');
      });
      
      if (analysis.count > 3) {
        log(`    ... et ${analysis.count - 3} autres`, 'yellow');
      }
    } else {
      log(`  ✅ Aucun type 'any' trouvé`, 'green');
    }
  });
  
  // Résumé global
  log('\n' + '=' .repeat(60), 'cyan');
  log('📊 RÉSUMÉ DE L\'ANALYSE', 'magenta');
  log(`📁 Fichiers analysés: ${PRIORITY_FILES.length}`, 'cyan');
  log(`🔤 Types 'any' trouvés: ${totalAny}`, 'red');
  
  // Compter le total global
  try {
    const globalCount = execSync('grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' });
    log(`🌍 Total global: ${globalCount.trim()} types 'any'`, 'yellow');
  } catch (error) {
    log('❌ Impossible de compter le total global', 'red');
  }
  
  // Créer les définitions de types
  log('\n📝 CRÉATION DES DÉFINITIONS DE TYPES', 'blue');
  const typeDefs = createTypeDefinitions();
  
  const typesFile = 'src/types/generated.ts';
  try {
    fs.writeFileSync(typesFile, typeDefs, 'utf8');
    log(`✅ Types générés: ${typesFile}`, 'green');
  } catch (error) {
    log(`❌ Erreur lors de la création de ${typesFile}: ${error.message}`, 'red');
  }
  
  // Recommandations
  log('\n🎯 RECOMMANDATIONS POUR LA SUITE', 'magenta');
  log('1. Corriger manuellement les types dans les fichiers prioritaires', 'cyan');
  log('2. Utiliser les types générés dans src/types/generated.ts', 'cyan');
  log('3. Remplacer progressivement les "any" par des types spécifiques', 'cyan');
  log('4. Tester après chaque correction pour éviter les erreurs', 'cyan');
  
  log('\n✨ Phase 2 - Analyse terminée !', 'bright');
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFile, suggestReplacement, createTypeDefinitions }; 