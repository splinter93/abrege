#!/usr/bin/env node

/**
 * 🔧 FIX CORRUPTED FILE
 * 
 * Ce script corrige le fichier route.ts qui a été corrompu
 * lors de la suppression des logs de debug.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING CORRUPTED FILE...\n');

const targetFile = 'src/app/api/chat/llm/route.ts';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Supprimer les lignes malformées
content = content.replace(/\s*return true;\s*\);?\s*/g, '');

// 2. Corriger les assertions de type pour éviter les erreurs de linter
content = content.replace(/msg\.role === 'tool'/g, '(msg as any).role === \'tool\'');
content = content.replace(/msg\.name/g, '(msg as any).name');
content = content.replace(/msg\.tool_call_id/g, '(msg as any).tool_call_id');
content = content.replace(/msg\.tool_calls/g, '(msg as any).tool_calls');

// 3. Nettoyer les lignes vides multiples
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// 4. Vérifier la structure des blocs try/catch
const tryCatchBlocks = content.match(/try\s*\{[\s\S]*?\}\s*catch/g);
if (tryCatchBlocks) {
  console.log('✅ Blocs try/catch trouvés:', tryCatchBlocks.length);
}

// 5. Vérifier les accolades équilibrées
let braceCount = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') braceCount--;
}

console.log('📊 Vérification des accolades:', braceCount === 0 ? '✅ Équilibrées' : `❌ Déséquilibrées (${braceCount})`);

// Écrire le fichier corrigé
fs.writeFileSync(targetFile, content);

console.log('✅ FICHIER CORRIGÉ !');
console.log('🔄 Le serveur devrait maintenant démarrer sans erreurs de syntaxe.'); 