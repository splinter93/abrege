#!/bin/bash

# Script de déploiement pour l'API avec support des slugs
# Usage: ./scripts/deploy.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement de l'API avec support des slugs..."
echo "================================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    log_error "package.json non trouvé. Assurez-vous d'être dans le répertoire du projet."
    exit 1
fi

# Étape 1: Vérifier les dépendances
log_info "Vérification des dépendances..."
npm install

# Étape 2: Vérifier les variables d'environnement
log_info "Vérification des variables d'environnement..."
if [ ! -f ".env" ]; then
    log_error "Fichier .env non trouvé. Veuillez le créer avec vos variables Supabase."
    exit 1
fi

# Étape 3: Linter le code
log_info "Vérification du code avec ESLint..."
npm run lint

# Étape 4: Tests
log_info "Exécution des tests..."
npm run test-endpoints

# Étape 5: Build
log_info "Build du projet..."
npm run build

# Étape 6: Vérification des colonnes slug
log_info "Vérification des colonnes slug dans Supabase..."
npm run add-slug-columns

# Étape 7: Migration des données (optionnel)
read -p "Voulez-vous migrer les données existantes vers les slugs ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Migration des données existantes..."
    npm run migrate-slugs
else
    log_warn "Migration des données ignorée. Vous pourrez la faire plus tard avec: npm run migrate-slugs"
fi

# Étape 8: Tests finaux
log_info "Tests finaux..."
npm run test-slugs

# Étape 9: Déploiement
log_info "Déploiement..."
echo "Choisissez votre plateforme de déploiement:"
echo "1. Vercel (recommandé)"
echo "2. Netlify"
echo "3. Autre (manuel)"

read -p "Votre choix (1-3): " choice

case $choice in
    1)
        log_info "Déploiement sur Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            log_warn "Vercel CLI non installé. Installez-le avec: npm i -g vercel"
            log_info "Ou déployez manuellement sur vercel.com"
        fi
        ;;
    2)
        log_info "Déploiement sur Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod
        else
            log_warn "Netlify CLI non installé. Installez-le avec: npm i -g netlify-cli"
            log_info "Ou déployez manuellement sur netlify.com"
        fi
        ;;
    3)
        log_info "Déploiement manuel..."
        log_warn "Déployez manuellement votre build sur votre plateforme préférée."
        ;;
    *)
        log_error "Choix invalide"
        exit 1
        ;;
esac

# Étape 10: Vérification post-déploiement
log_info "Vérification post-déploiement..."
echo "Vérifiez que votre API fonctionne avec:"
echo "curl https://votre-domaine.com/api/v1/slug/generate"

log_info "🎉 Déploiement terminé !"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Tester vos endpoints avec des slugs"
echo "2. Vérifier la migration des données"
echo "3. Mettre à jour votre documentation"
echo ""
echo "📚 Documentation:"
echo "- API V2 intégrée"
echo "- MIGRATION-GUIDE.md"
echo ""
echo "🔧 Scripts utiles:"
echo "- npm run test-endpoints : Tester les endpoints"
echo "- npm run migrate-slugs : Migrer les données"
echo "- npm run test-slugs : Tester la génération de slugs" 