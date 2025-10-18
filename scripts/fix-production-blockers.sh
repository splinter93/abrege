#!/bin/bash

# 🚀 Script de Correction des Blocants Production
# Date: 12 Octobre 2025
# Usage: bash scripts/fix-production-blockers.sh

set -e  # Exit on error

echo "🚀 CORRECTION DES BLOCANTS PRODUCTION"
echo "===================================="
echo ""

# Couleurs
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Vérifier si .env.production existe
echo -e "${BLUE}[1/5] Vérification du fichier .env.production...${NC}"
if [ -f ".env.production" ]; then
    echo -e "${RED}⚠️  ALERTE : .env.production trouvé dans le dépôt !${NC}"
    echo ""
    echo -e "${YELLOW}ACTION REQUISE MANUELLEMENT :${NC}"
    echo "1. Révoquer ces clés API :"
    echo "   - Supabase: https://supabase.com/dashboard"
    echo "   - Groq: https://console.groq.com/"
    echo "   - DeepSeek: https://platform.deepseek.com/"
    echo "   - Together AI: https://together.ai/"
    echo ""
    echo "2. Créer nouvelles clés API"
    echo ""
    echo "3. Configurer sur Vercel Dashboard"
    echo ""
    echo "4. Puis exécuter:"
    echo "   git filter-repo --path .env.production --invert-paths"
    echo ""
    read -p "Appuyez sur Entrée quand c'est fait..."
else
    echo -e "${GREEN}✅ Pas de .env.production dans le dépôt${NC}"
fi
echo ""

# 2. Ajouter au .gitignore
echo -e "${BLUE}[2/5] Mise à jour du .gitignore...${NC}"
if ! grep -q "^\.env\.production$" .gitignore 2>/dev/null; then
    echo ".env.production" >> .gitignore
    echo ".env.local" >> .gitignore
    echo ".env.*.local" >> .gitignore
    echo -e "${GREEN}✅ .gitignore mis à jour${NC}"
else
    echo -e "${GREEN}✅ .gitignore déjà à jour${NC}"
fi
echo ""

# 3. Remplacer console.log par logger.dev
echo -e "${BLUE}[3/5] Remplacement des console.log par logger.dev...${NC}"
echo "Fichiers à corriger :"
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
    -exec grep -l "console\.log\|console\.debug" {} \; | head -10

read -p "Voulez-vous remplacer automatiquement ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup
    mkdir -p .backups
    tar -czf ".backups/before-console-fix-$(date +%Y%m%d-%H%M%S).tar.gz" src/
    
    # Remplacement
    find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
        -exec sed -i '' 's/console\.log(/logger.dev(/g' {} \;
    find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
        -exec sed -i '' 's/console\.debug(/logger.dev(/g' {} \;
    
    echo -e "${GREEN}✅ console.log remplacés (backup dans .backups/)${NC}"
else
    echo -e "${YELLOW}⏭  Skipped${NC}"
fi
echo ""

# 4. Corriger les variables inutilisées
echo -e "${BLUE}[4/5] Correction automatique ESLint...${NC}"
npm run lint:fix
echo -e "${GREEN}✅ ESLint fixé automatiquement${NC}"
echo ""

# 5. Vérifier TypeScript
echo -e "${BLUE}[5/5] Vérification TypeScript...${NC}"
if grep -q '"strict": false' tsconfig.json; then
    echo -e "${YELLOW}⚠️  TypeScript strict mode désactivé${NC}"
    echo ""
    echo "Pour activer (RECOMMANDÉ) :"
    echo "  sed -i '' 's/\"strict\": false/\"strict\": true/' tsconfig.json"
    echo ""
    read -p "Activer maintenant ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sed -i '' 's/"strict": false/"strict": true/' tsconfig.json
        echo -e "${GREEN}✅ TypeScript strict mode activé${NC}"
        echo -e "${YELLOW}⚠️  Lancez 'npm run audit' pour voir les erreurs à corriger${NC}"
    fi
else
    echo -e "${GREEN}✅ TypeScript strict mode déjà activé${NC}"
fi
echo ""

# Résumé
echo ""
echo "========================================"
echo -e "${GREEN}✅ CORRECTIONS TERMINÉES${NC}"
echo "========================================"
echo ""
echo "PROCHAINES ÉTAPES :"
echo ""
echo "1. Vérifier le build :"
echo "   npm run build"
echo ""
echo "2. Corriger les erreurs TypeScript restantes :"
echo "   npm run audit"
echo ""
echo "3. Tester localement :"
echo "   npm run dev"
echo ""
echo "4. Configurer les variables sur Vercel :"
echo "   https://vercel.com/dashboard"
echo ""
echo "5. Déployer :"
echo "   git add ."
echo "   git commit -m 'fix: corrections blocants production'"
echo "   git push"
echo ""
echo -e "${BLUE}📄 Voir détails : AUDIT-PRODUCTION-COMPLET-OCT2025.md${NC}"





