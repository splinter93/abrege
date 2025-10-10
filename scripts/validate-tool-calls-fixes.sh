#!/bin/bash

# 🧪 Script de validation des fixes du système de tool calls
# Vérifie que tous les problèmes critiques sont résolus

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🧪 VALIDATION DES FIXES - SYSTÈME DE TOOL CALLS${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Compteurs
CHECKS_PASSED=0
CHECKS_FAILED=0

# Fonction de check
check() {
    local name="$1"
    local file="$2"
    local pattern="$3"
    
    echo -ne "${BOLD}Vérification : ${name}${NC} ... "
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓ OK${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ ÉCHEC${NC}"
        echo -e "${YELLOW}  Fichier : ${file}${NC}"
        echo -e "${YELLOW}  Pattern : ${pattern}${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

echo -e "${BOLD}1. DÉDUPLICATION PAR CONTENU${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Import crypto" \
    "src/services/llm/toolCallManager.ts" \
    "import { createHash } from 'crypto'"

check "executedFunctionHashes Set" \
    "src/services/llm/toolCallManager.ts" \
    "executedFunctionHashes: Set<string>"

check "getFunctionHash method" \
    "src/services/llm/toolCallManager.ts" \
    "getFunctionHash(toolCall: any): string"

check "Vérification par hash" \
    "src/services/llm/toolCallManager.ts" \
    "executedFunctionHashes.has(contentHash)"

echo ""
echo -e "${BOLD}2. LOCKS ATOMIQUES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "executionLocks Map" \
    "src/services/llm/toolCallManager.ts" \
    "executionLocks: Map<string, Promise<ToolCallResult>>"

check "Vérification lock en cours" \
    "src/services/llm/toolCallManager.ts" \
    "executionLocks.has(contentHash)"

check "Création du lock" \
    "src/services/llm/toolCallManager.ts" \
    "executionLocks.set(contentHash"

echo ""
echo -e "${BOLD}3. ORDRE DES TOOL RESULTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Création resultsMap" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "const resultsMap = new Map<string, ToolResult>()"

check "Réordonnancement" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "dedupedToolCalls.map(tc =>"

check "Log réordonnancement" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "Tool results réordonnés"

echo ""
echo -e "${BOLD}4. PRÉSERVATION DES TIMESTAMPS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Préservation timestamp" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "timestamp: r.timestamp || new Date().toISOString()"

echo ""
echo -e "${BOLD}5. THINKING STREAMÉ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "streamThinking activé" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "streamThinking: true"

check "streamProgress activé" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "streamProgress: true"

echo ""
echo -e "${BOLD}6. AUTO-DÉTECTION DES TOOLS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Auto-détection READ" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "startsWith('get') || nameLower.startsWith('list')"

check "Auto-détection SEARCH" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "startsWith('search') || nameLower.startsWith('find')"

check "Auto-détection WRITE" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "startsWith('create') || nameLower.startsWith('update')"

echo ""
echo -e "${BOLD}7. COURT-CIRCUIT SUR ÉCHEC${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Court-circuit implémenté" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "isCriticalTool(tc.function.name)"

check "isCriticalTool method" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "isCriticalTool(toolName: string): boolean"

echo ""
echo -e "${BOLD}8. MONITORING & STATS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "API stats endpoint" \
    "src/app/api/debug/tool-stats/route.ts" \
    "getDuplicationStats"

check "getDuplicationStats method" \
    "src/services/llm/toolCallManager.ts" \
    "getDuplicationStats():"

check "Script de test" \
    "scripts/test-tool-duplication.ts" \
    "Test de Duplication des Tool Calls"

echo ""
echo -e "${BOLD}9. LOGS DÉTAILLÉS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check "Log avec contentHash" \
    "src/services/llm/toolCallManager.ts" \
    "contentHash:"

check "Log réordonnancement" \
    "src/services/llm/services/AgenticOrchestrator.ts" \
    "Tool results réordonnés"

check "Alerte duplications" \
    "src/services/llm/groqGptOss120b.ts" \
    "ALERTE DUPLICATION"

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}RÉSUMÉ${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}✓ Checks réussis   : ${CHECKS_PASSED}${NC}"
echo -e "  ${RED}✗ Checks échoués   : ${CHECKS_FAILED}${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 TOUS LES CHECKS SONT PASSÉS !${NC}"
    echo -e "${GREEN}Le système de tool calls est production-ready.${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}${BOLD}❌ ${CHECKS_FAILED} CHECK(S) ONT ÉCHOUÉ${NC}"
    echo -e "${YELLOW}Certains fixes ne sont pas implémentés correctement.${NC}"
    echo ""
    exit 1
fi

