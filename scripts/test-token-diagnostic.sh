#!/bin/bash

###############################################################################
# 🔍 SCRIPT DE DIAGNOSTIC TOKEN - LOCAL vs PRODUCTION
# 
# Ce script teste l'authentification et les tool calls en local et en production
###############################################################################

set -e

# Couleurs pour les logs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔍 DIAGNOSTIC TOKEN - LOCAL vs PRODUCTION               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour afficher un message de succès
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher un message d'erreur
error() {
  echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher un message d'information
info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Fonction pour afficher un titre de section
section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Fonction pour tester un endpoint
test_endpoint() {
  local URL=$1
  local TOKEN=$2
  local NAME=$3
  
  info "Test de $NAME..."
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL/api/debug/token" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    success "$NAME - HTTP $HTTP_CODE"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    return 0
  else
    error "$NAME - HTTP $HTTP_CODE"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    return 1
  fi
}

# ============================================================================
# CONFIGURATION
# ============================================================================

section "📋 CONFIGURATION"

# URL de l'application en local
LOCAL_URL="http://localhost:3000"

# URL de l'application en production (à modifier)
PROD_URL="${PROD_URL:-https://your-app.vercel.app}"

info "URL Local: $LOCAL_URL"
info "URL Production: $PROD_URL"

# Vérifier si jq est installé (pour parser le JSON)
if ! command -v jq &> /dev/null; then
  info "jq n'est pas installé. Installation recommandée pour un meilleur affichage."
  info "Sur macOS: brew install jq"
fi

# ============================================================================
# TEST 1 : RÉCUPÉRATION DU TOKEN
# ============================================================================

section "🔐 TEST 1 : Récupération du Token"

info "Pour tester, vous devez fournir un token d'authentification."
info "Méthode 1 : Variable d'environnement"
info "  export TEST_TOKEN=\"votre_token_ici\""
info ""
info "Méthode 2 : Récupérer depuis la console du navigateur"
info "  1. Ouvrir l'application en local"
info "  2. Ouvrir la console (F12)"
info "  3. Exécuter: supabase.auth.getSession().then(d => console.log(d.data.session?.access_token))"
info "  4. Copier le token affiché"
echo ""

# Vérifier si un token a été fourni
if [ -z "$TEST_TOKEN" ]; then
  echo -n "Token d'authentification (ou Enter pour passer): "
  read TEST_TOKEN
fi

if [ -z "$TEST_TOKEN" ]; then
  error "Aucun token fourni. Tests d'authentification ignorés."
  exit 0
fi

success "Token fourni : ${TEST_TOKEN:0:30}..."

# ============================================================================
# TEST 2 : DIAGNOSTIC LOCAL
# ============================================================================

section "🏠 TEST 2 : Diagnostic Local"

# Vérifier que le serveur local est lancé
if ! curl -s "$LOCAL_URL" > /dev/null 2>&1; then
  error "Le serveur local n'est pas accessible sur $LOCAL_URL"
  info "Lancez le serveur avec: npm run dev"
  LOCAL_TEST_FAILED=1
else
  test_endpoint "$LOCAL_URL" "$TEST_TOKEN" "Local" && LOCAL_TEST_PASSED=1 || LOCAL_TEST_FAILED=1
fi

# ============================================================================
# TEST 3 : DIAGNOSTIC PRODUCTION
# ============================================================================

section "🚀 TEST 3 : Diagnostic Production"

# Demander si l'utilisateur veut tester en production
if [ "$PROD_URL" = "https://your-app.vercel.app" ]; then
  echo -n "URL de production (ou Enter pour passer): "
  read PROD_URL_INPUT
  if [ ! -z "$PROD_URL_INPUT" ]; then
    PROD_URL="$PROD_URL_INPUT"
  else
    info "Test en production ignoré."
    PROD_TEST_SKIPPED=1
  fi
fi

if [ -z "$PROD_TEST_SKIPPED" ]; then
  test_endpoint "$PROD_URL" "$TEST_TOKEN" "Production" && PROD_TEST_PASSED=1 || PROD_TEST_FAILED=1
fi

# ============================================================================
# RÉSUMÉ
# ============================================================================

section "📊 RÉSUMÉ DES TESTS"

if [ ! -z "$LOCAL_TEST_PASSED" ]; then
  success "Local : Tests réussis ✅"
elif [ ! -z "$LOCAL_TEST_FAILED" ]; then
  error "Local : Tests échoués ❌"
fi

if [ ! -z "$PROD_TEST_PASSED" ]; then
  success "Production : Tests réussis ✅"
elif [ ! -z "$PROD_TEST_FAILED" ]; then
  error "Production : Tests échoués ❌"
elif [ ! -z "$PROD_TEST_SKIPPED" ]; then
  info "Production : Tests ignorés ⏭️"
fi

# ============================================================================
# RECOMMANDATIONS
# ============================================================================

section "💡 RECOMMANDATIONS"

if [ ! -z "$LOCAL_TEST_FAILED" ] || [ ! -z "$PROD_TEST_FAILED" ]; then
  error "Des tests ont échoué. Vérifiez les points suivants :"
  echo ""
  echo "1. Variables d'environnement"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo ""
  echo "2. Token d'authentification"
  echo "   - Le token est-il valide ?"
  echo "   - Le token a-t-il expiré ?"
  echo "   - Le token correspond-il au bon environnement ?"
  echo ""
  echo "3. Logs détaillés"
  echo "   - Consultez les logs Vercel pour plus de détails"
  echo "   - Cherchez les logs [TokenManager] et [ApiV2HttpClient]"
  echo ""
else
  success "Tous les tests ont réussi ! 🎉"
  info "Les tool calls devraient fonctionner correctement."
fi

echo ""
info "Pour plus d'informations, consultez :"
info "  docs/corrections/FIX-ERREUR-401-PROD-TOOLS.md"
echo ""

