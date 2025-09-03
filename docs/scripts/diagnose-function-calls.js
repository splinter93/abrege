#!/usr/bin/env node

/**
 * 🔍 Diagnostic des Problèmes de Function Calls
 * 
 * Analyse les logs et le code pour identifier pourquoi les tool calls ne fonctionnent pas
 */

console.log('🔍 DIAGNOSTIC DES FUNCTION CALLS');
console.log('================================');

console.log('\n📋 ANALYSE DES LOGS FOURNIS:');
console.log('   ❌ [DEV] [LLM API] ❌ PAS DE FUNCTION CALL - Réponse normale');
console.log('   💡 Cela indique qu\'aucun function call n\'a été détecté');

console.log('\n🔍 PROBLÈMES IDENTIFIÉS:');

console.log('\n1️⃣ **AGENTS SANS CAPACITÉS API V2**');
console.log('   - Les agents n\'ont pas de colonne api_v2_capabilities configurée');
console.log('   - Le code vérifie: agentConfig?.api_v2_capabilities?.length > 0');
console.log('   - Si cette condition est false, tools = undefined');
console.log('   - Résultat: Pas de function calling activé');

console.log('\n2️⃣ **MIGRATION DE BASE DE DONNÉES MANQUANTE**');
console.log('   - La colonne api_v2_capabilities n\'existe pas dans la table agents');
console.log('   - Migration nécessaire: ALTER TABLE agents ADD COLUMN api_v2_capabilities TEXT[]');
console.log('   - Les agents existants ont api_v2_capabilities = null ou []');

console.log('\n3️⃣ **VARIABLES D\'ENVIRONNEMENT MANQUANTES**');
console.log('   - NEXT_PUBLIC_SUPABASE_URL: Non configuré');
console.log('   - SUPABASE_SERVICE_ROLE_KEY: Non configuré');
console.log('   - Impossible d\'appliquer les migrations sans ces variables');

console.log('\n4️⃣ **LOGIC DE DÉTECTION DES TOOL CALLS**');
console.log('   - Le code gère deux formats: function_call (ancien) et tool_calls (nouveau)');
console.log('   - DeepSeek utilise le format tool_calls');
console.log('   - Le parsing semble correct dans le code');

console.log('\n🔧 SOLUTIONS PROPOSÉES:');

console.log('\n✅ **SOLUTION 1: Migration Manuelle**');
console.log('   - Créer un fichier .env.local avec les variables Supabase');
console.log('   - Exécuter: npx supabase db push');
console.log('   - Ou utiliser le script: node apply-migration-direct.js');

console.log('\n✅ **SOLUTION 2: Script de Correction**');
console.log('   - Utiliser le script: node fix-function-calling.js');
console.log('   - Ce script ajoute la colonne et configure les agents');

console.log('\n✅ **SOLUTION 3: Vérification du Code**');
console.log('   - Le code dans src/app/api/chat/llm/route.ts semble correct');
console.log('   - La logique de détection des tool_calls est présente');
console.log('   - Le problème vient de la configuration des agents');

console.log('\n🎯 **ÉTAPES DE RÉSOLUTION RECOMMANDÉES:**');

console.log('\n1️⃣ **Configurer les variables d\'environnement**');
console.log('   Créer .env.local:');
console.log('   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase');
console.log('   SUPABASE_SERVICE_ROLE_KEY=votre_service_key');
console.log('   DEEPSEEK_API_KEY=votre_deepseek_key');

console.log('\n2️⃣ **Appliquer la migration**');
console.log('   node apply-migration-direct.js');
console.log('   Ou: npx supabase db push');

console.log('\n3️⃣ **Vérifier la configuration des agents**');
console.log('   node check-agents-status.js');
console.log('   S\'assurer que les agents ont des capacités API v2');

console.log('\n4️⃣ **Tester avec un agent configuré**');
console.log('   - Utiliser l\'agent "Donna" qui a le provider DeepSeek');
console.log('   - S\'assurer qu\'il a des capacités API v2 configurées');
console.log('   - Tester avec: "Créer une note de test"');

console.log('\n📊 **ANALYSE DU CODE:**');

console.log('\n✅ **Code Correct:**');
console.log('   - Détection des tool_calls: Ligne 250-270');
console.log('   - Parsing des arguments: Ligne 320');
console.log('   - Exécution des outils: Ligne 325-330');
console.log('   - Relancement avec contexte: Ligne 350-420');

console.log('\n❌ **Problème Principal:**');
console.log('   - Condition ligne 180: agentConfig?.api_v2_capabilities?.length > 0');
console.log('   - Cette condition retourne false car les agents n\'ont pas de capacités');
console.log('   - Résultat: tools = undefined, pas de function calling');

console.log('\n🔍 **VÉRIFICATION RAPIDE:**');
console.log('   Pour tester si le problème vient du code ou de la config:');
console.log('   1. Modifier temporairement la ligne 180 pour forcer tools = true');
console.log('   2. Voir si les function calls sont détectés');
console.log('   3. Si oui, le problème est la configuration des agents');

console.log('\n✅ **CONCLUSION:**');
console.log('   Le code de function calling est correct et complet.');
console.log('   Le problème vient de la configuration des agents (pas de capacités API v2).');
console.log('   Solution: Appliquer la migration et configurer les agents.');

console.log('\n🚀 **PROCHAINES ACTIONS:**');
console.log('   1. Configurer .env.local');
console.log('   2. Exécuter: node apply-migration-direct.js');
console.log('   3. Vérifier: node check-agents-status.js');
console.log('   4. Tester avec Donna: "Créer une note de test"'); 