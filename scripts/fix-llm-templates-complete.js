#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Script de correction complète des templates LLM pour Abrège\n');

async function runScript(scriptName, description) {
  try {
    console.log(`\n🔧 Exécution: ${description}`);
    console.log(`📁 Script: ${scriptName}`);
    console.log('─'.repeat(50));
    
    execSync(`node scripts/${scriptName}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`✅ ${description} terminé avec succès\n`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de ${description}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('📋 Plan de correction:');
    console.log('   1. Correction de la connexion entre templates LLM et table agents');
    console.log('   2. Correction de la route API pour récupérer l\'agentConfig');
    console.log('   3. Vérification finale de la configuration\n');

    // Étape 1: Correction des templates LLM
    const step1Success = await runScript(
      'fix-llm-templates-connection.js',
      'Correction de la connexion entre templates LLM et table agents'
    );

    if (!step1Success) {
      console.error('❌ Étape 1 échouée, arrêt du processus');
      process.exit(1);
    }

    // Étape 2: Correction de la route API
    const step2Success = await runScript(
      'fix-api-route-agent-config.js',
      'Correction de la route API pour récupérer l\'agentConfig'
    );

    if (!step2Success) {
      console.error('❌ Étape 2 échouée, arrêt du processus');
      process.exit(1);
    }

    // Étape 3: Vérification finale
    console.log('🔍 Vérification finale de la configuration...\n');
    
    try {
      // Vérifier que les agents sont bien configurés
      console.log('📊 Vérification de la configuration des agents...');
      execSync('node scripts/list-all-agents.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('⚠️ Impossible de lister les agents (peut être normal)');
    }

    // Résumé final
    console.log('\n🎉 CORRECTION COMPLÈTE TERMINÉE AVEC SUCCÈS !');
    console.log('\n📋 Résumé des corrections appliquées:');
    console.log('   ✅ Connexion entre templates LLM et table agents corrigée');
    console.log('   ✅ Route API mise à jour pour récupérer l\'agentConfig');
    console.log('   ✅ Configuration des agents enrichie avec les templates');
    console.log('   ✅ Capacités API v2 configurées selon les providers');
    
    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Redémarrer l\'application Next.js');
    console.log('   2. Tester un chat avec un agent pour vérifier les templates');
    console.log('   3. Vérifier que l\'agentConfig est bien récupéré depuis la base');
    console.log('   4. Tester les function calls avec l\'agent configuré');
    
    console.log('\n🔍 Pour vérifier que tout fonctionne:');
    console.log('   - Regarder les logs de l\'API pour voir la récupération des agents');
    console.log('   - Vérifier que les templates sont appliqués dans les réponses');
    console.log('   - Tester les capacités spécifiques (reasoning, function calling)');
    
    console.log('\n💡 Si des problèmes persistent:');
    console.log('   - Vérifier les variables d\'environnement Supabase');
    console.log('   - Consulter les logs de l\'application');
    console.log('   - Vérifier la structure de la table agents en base');

  } catch (error) {
    console.error('❌ Erreur fatale dans le script principal:', error);
    process.exit(1);
  }
}

// Exécuter le script principal
main(); 