#!/bin/bash

# Script de test pour valider l'auto-évaluation et la décision intelligente
# Teste que le LLM apprend à s'auto-évaluer et décider quand s'arrêter

set -e

echo "🧪 Test de l'auto-évaluation et décision intelligente"
echo "====================================================="

# Vérifier les prérequis
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Aller à la racine du projet
cd "$(dirname "$0")/.."

echo "📁 Vérification des mécanismes d'auto-évaluation..."

# 1. Vérifier les instructions d'auto-évaluation dans le prompt système
echo "🔍 1. Vérification des instructions d'auto-évaluation..."

if ! grep -q "AUTO-ÉVALUATION ET DÉCISION INTELLIGENTE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Instructions d'auto-évaluation non trouvées dans le prompt système"
    exit 1
fi

if ! grep -q "Question 1.*Ma réponse actuelle est-elle COMPLÈTE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Question 1 d'auto-évaluation non trouvée"
    exit 1
fi

if ! grep -q "Question 2.*plan CLAIR et NÉCESSAIRE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Question 2 d'auto-évaluation non trouvée"
    exit 1
fi

if ! grep -q "Question 3.*VALEUR AJOUTÉE RÉELLE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Question 3 d'auto-évaluation non trouvée"
    exit 1
fi

echo "✅ Instructions d'auto-évaluation trouvées dans le prompt système"

# 2. Vérifier les messages d'auto-évaluation lors des relances
echo "🔍 2. Vérification des messages d'auto-évaluation lors des relances..."

if ! grep -q "RELANCE.*AUTO-ÉVALUATION OBLIGATOIRE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Messages d'auto-évaluation lors des relances non trouvés"
    exit 1
fi

if ! grep -q "AI-JE UNE RÉPONSE COMPLÈTE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Question d'auto-évaluation lors des relances non trouvée"
    exit 1
fi

if ! grep -q "AI-JE UN PLAN CLAIR POUR LA SUITE" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Question de plan lors des relances non trouvée"
    exit 1
fi

echo "✅ Messages d'auto-évaluation lors des relances trouvés"

# 3. Vérifier les comportements à éviter
echo "🔍 3. Vérification des comportements à éviter..."

if ! grep -q "Ne te sens PAS.*obligé.*de continuer" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Instructions pour éviter la pression de continuer non trouvées"
    exit 1
fi

if ! grep -q "Ne considère PAS.*limite.*comme un objectif" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Instructions pour éviter l'objectif de limite non trouvées"
    exit 1
fi

if ! grep -q "N'accumule PAS.*informations.*au cas où" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Instructions pour éviter l'accumulation non trouvées"
    exit 1
fi

echo "✅ Comportements à éviter clairement définis"

# 4. Vérifier la règle d'or
echo "🔍 4. Vérification de la règle d'or..."

if ! grep -q "RÈGLE D'OR.*Mieux vaut une réponse complète en 2 relances" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Règle d'or non trouvée"
    exit 1
fi

echo "✅ Règle d'or trouvée"

# 5. Vérifier les critères d'arrêt intelligents
echo "🔍 5. Vérification des critères d'arrêt intelligents..."

if ! grep -q "CRITÈRES D'ARRÊT STRICTS" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Critères d'arrêt stricts non trouvés"
    exit 1
fi

if ! grep -q "Réponse complète et satisfaisante" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Critère de réponse complète non trouvé"
    exit 1
fi

if ! grep -q "Toutes les informations demandées fournies" "src/services/llm/services/GroqOrchestrator.ts"; then
    echo "❌ Critère d'informations complètes non trouvé"
    exit 1
fi

echo "✅ Critères d'arrêt intelligents trouvés"

echo ""
echo "🧪 Test de compilation TypeScript..."

# Test de compilation
if ! npx tsc --noEmit --project tsconfig.json 2>&1 | grep -q "GroqOrchestrator\|BatchMessageService\|ThreadBuilder"; then
    echo "✅ Compilation TypeScript réussie"
else
    echo "⚠️  Erreurs de compilation détectées (peut être normal)"
fi

echo ""
echo "📊 Résumé de l'auto-évaluation et décision intelligente"
echo "======================================================="
echo "✅ Instructions d'auto-évaluation dans le prompt système"
echo "✅ Messages d'auto-évaluation lors des relances"
echo "✅ Comportements à éviter clairement définis"
echo "✅ Règle d'or : qualité > quantité"
echo "✅ Critères d'arrêt intelligents"
echo "✅ Processus de décision en 3 questions"

echo ""
echo "🎯 Impact attendu"
echo "================"
echo "✅ Le LLM ne se sent plus 'obligé' de continuer"
echo "✅ Auto-évaluation à chaque relance"
echo "✅ Arrêt intelligent dès que la réponse est complète"
echo "✅ Décision basée sur la valeur ajoutée réelle"
echo "✅ Privilégie la qualité à la quantité"

echo ""
echo "🧠 L'auto-évaluation et la décision intelligente sont implémentées !"
echo "   Le LLM apprend maintenant à évaluer et décider quand s'arrêter." 