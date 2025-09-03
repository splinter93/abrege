#!/bin/bash

# Script pour configurer la purge automatique de la corbeille
# Ce script déploie la fonction Edge et configure le cron job

set -e

echo "🗑️ Configuration de la purge automatique de la corbeille..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé. Veuillez l'installer d'abord."
    echo "   npm install -g supabase"
    exit 1
fi

# Vérifier que nous sommes connectés à Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à Supabase. Veuillez vous connecter d'abord."
    echo "   supabase login"
    exit 1
fi

echo "📦 Déploiement de la fonction Edge trash-purge..."

# Déployer la fonction Edge
supabase functions deploy trash-purge

echo "✅ Fonction Edge déployée avec succès"

echo "⏰ Configuration du cron job..."

# Créer le cron job pour exécuter la purge tous les jours à 2h du matin
# Note: Ceci nécessite d'être configuré manuellement dans le dashboard Supabase
# ou via l'API de gestion

echo "📋 Instructions pour configurer le cron job:"
echo ""
echo "1. Allez dans le dashboard Supabase: https://supabase.com/dashboard"
echo "2. Sélectionnez votre projet"
echo "3. Allez dans 'Database' > 'Cron Jobs'"
echo "4. Créez un nouveau cron job avec les paramètres suivants:"
echo "   - Name: trash-purge-daily"
echo "   - Schedule: 0 2 * * * (tous les jours à 2h du matin)"
echo "   - SQL: SELECT cron.schedule('trash-purge-daily', '0 2 * * *', 'SELECT net.http_post(url:=''https://YOUR_PROJECT_REF.supabase.co/functions/v1/trash-purge'', headers:=''{"Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb) as request_id;');"
echo ""
echo "Ou utilisez cette commande SQL dans l'éditeur SQL:"
echo ""
echo "SELECT cron.schedule("
echo "  'trash-purge-daily',"
echo "  '0 2 * * *',"
echo "  'SELECT net.http_post("
echo "    url:=''https://YOUR_PROJECT_REF.supabase.co/functions/v1/trash-purge'',"
echo "    headers:=''{\"Authorization\": \"Bearer YOUR_ANON_KEY\"}''::jsonb"
echo "  ) as request_id;'"
echo ");"
echo ""
echo "Remplacez YOUR_PROJECT_REF et YOUR_ANON_KEY par vos vraies valeurs."

echo ""
echo "🎉 Configuration terminée!"
echo "La purge automatique s'exécutera tous les jours à 2h du matin."
