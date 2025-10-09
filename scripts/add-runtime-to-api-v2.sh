#!/bin/bash

# Script pour ajouter runtime nodejs à tous les endpoints API v2
# Cela fixe le problème 401 en production causé par Edge Runtime

echo "🔧 Ajout de runtime nodejs à tous les endpoints API v2..."

find src/app/api/v2 -name "route.ts" -type f | while read file; do
  # Vérifier si le fichier contient déjà "export const runtime"
  if grep -q "export const runtime" "$file"; then
    echo "  ⏭️  Déjà présent: $file"
  else
    echo "  ✅ Ajout runtime: $file"
    
    # Créer le contenu avec runtime
    cat > "${file}.tmp" << 'EOF'
import { NextRequest, NextResponse } from 'next/server';

// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

EOF
    
    # Ajouter le reste du fichier (en sautant la première ligne d'import si elle existe)
    tail -n +2 "$file" >> "${file}.tmp"
    
    # Remplacer le fichier original
    mv "${file}.tmp" "$file"
  fi
done

echo "✅ Terminé !"

