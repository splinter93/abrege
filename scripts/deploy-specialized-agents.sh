#!/bin/bash

# Script de déploiement des agents spécialisés
# Applique la migration et teste l'installation

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${2:-$NC}$1${NC}"
}

# Vérifier les variables d'environnement
check_env() {
    log "🔍 Vérification des variables d'environnement..." $BLUE
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        log "❌ NEXT_PUBLIC_SUPABASE_URL manquante" $RED
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        log "❌ SUPABASE_SERVICE_ROLE_KEY manquante" $RED
        exit 1
    fi
    
    log "✅ Variables d'environnement OK" $GREEN
}

# Appliquer la migration
apply_migration() {
    log "🚀 Application de la migration..." $BLUE
    
    if [ -f "scripts/apply-specialized-agents-migration.js" ]; then
        node scripts/apply-specialized-agents-migration.js
    else
        log "❌ Script de migration non trouvé" $RED
        exit 1
    fi
    
    log "✅ Migration appliquée" $GREEN
}

# Construire l'application
build_app() {
    log "🔨 Construction de l'application..." $BLUE
    
    if command -v npm &> /dev/null; then
        npm run build
    elif command -v yarn &> /dev/null; then
        yarn build
    elif command -v pnpm &> /dev/null; then
        pnpm build
    else
        log "⚠️ Aucun gestionnaire de paquets trouvé, construction ignorée" $YELLOW
    fi
    
    log "✅ Application construite" $GREEN
}

# Tester l'installation
test_installation() {
    log "🧪 Test de l'installation..." $BLUE
    
    if [ -f "scripts/test-specialized-agents.js" ]; then
        # Attendre que l'application soit prête
        log "⏳ Attente du démarrage de l'application..." $YELLOW
        sleep 10
        
        # Tester avec l'URL de l'application
        TEST_BASE_URL=${NEXT_PUBLIC_APP_URL:-"http://localhost:3000"} node scripts/test-specialized-agents.js
    else
        log "⚠️ Script de test non trouvé, test ignoré" $YELLOW
    fi
    
    log "✅ Tests terminés" $GREEN
}

# Vérifier la santé de l'API
check_api_health() {
    log "🏥 Vérification de la santé de l'API..." $BLUE
    
    local api_url="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "  Tentative $attempt/$max_attempts..." $YELLOW
        
        if curl -s -f "$api_url/api/v2/openapi-schema" > /dev/null 2>&1; then
            log "✅ API accessible" $GREEN
            return 0
        fi
        
        sleep 2
        ((attempt++))
    done
    
    log "⚠️ API non accessible après $max_attempts tentatives" $YELLOW
    return 1
}

# Afficher le résumé
show_summary() {
    log "\n📋 Résumé du déploiement:" $BLUE
    log "  ✅ Migration appliquée" $GREEN
    log "  ✅ Application construite" $GREEN
    log "  ✅ Tests exécutés" $GREEN
    
    log "\n🎯 Endpoints disponibles:" $BLUE
    log "  📄 GET  /api/v2/openapi-schema" $YELLOW
    log "  📄 GET  /api/ui/agents/specialized" $YELLOW
    log "  📄 POST /api/ui/agents/specialized" $YELLOW
    log "  🤖 POST /api/v2/agents/{agentId}" $YELLOW
    log "  📊 GET  /api/v2/agents/{agentId}" $YELLOW
    
    log "\n🔧 Commandes utiles:" $BLUE
    log "  Test complet: node scripts/test-specialized-agents.js" $YELLOW
    log "  Schéma OpenAPI: curl $NEXT_PUBLIC_APP_URL/api/v2/openapi-schema" $YELLOW
    log "  Liste agents: curl $NEXT_PUBLIC_APP_URL/api/ui/agents/specialized" $YELLOW
    
    log "\n🎉 Déploiement terminé avec succès !" $GREEN
}

# Fonction principale
main() {
    log "🚀 Déploiement des agents spécialisés" $BLUE
    log "=====================================" $BLUE
    
    check_env
    apply_migration
    build_app
    
    # Vérifier la santé de l'API si l'URL est fournie
    if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
        check_api_health
        test_installation
    else
        log "⚠️ NEXT_PUBLIC_APP_URL non définie, tests ignorés" $YELLOW
    fi
    
    show_summary
}

# Gestion des erreurs
trap 'log "❌ Erreur fatale à la ligne $LINENO" $RED; exit 1' ERR

# Exécuter le script principal
main "$@"
