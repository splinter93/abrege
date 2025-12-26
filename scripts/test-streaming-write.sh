#!/bin/bash

# Script de test pour l'écriture en streaming
# Usage: ./scripts/test-streaming-write.sh <noteId> <token>

NOTE_ID="${1:-d1f3f3d5-c308-49ed-838d-7e00939dfb85}"
TOKEN="${2:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ Token JWT requis"
  echo "Usage: $0 <noteId> <token>"
  echo ""
  echo "Pour récupérer le token depuis le navigateur:"
  echo "1. Ouvre la console du navigateur"
  echo "2. Exécute: JSON.parse(localStorage.getItem('sb-localhost-auth-token')).access_token"
  exit 1
fi

BASE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/v2/note/${NOTE_ID}/stream:write"

echo "🚀 Test d'écriture en streaming"
echo "📝 Note ID: ${NOTE_ID}"
echo "🌐 Endpoint: ${ENDPOINT}"
echo ""

# Texte à envoyer en streaming
TEXT="# Test d'écriture en streaming

Ceci est un test d'écriture en streaming pour la note ${NOTE_ID}.

## Fonctionnalités testées

1. **Envoi de chunks progressifs** : Le texte est envoyé par petits morceaux
2. **Affichage en temps réel** : Les chunks doivent apparaître dans l'éditeur/canvas en temps réel
3. **Position d'insertion** : Le texte est inséré à la fin du document

### Détails techniques

- Endpoint utilisé : \`POST /api/v2/note/{ref}/stream:write\`
- Format : JSON avec \`chunk\` (string) et \`position\` (end/start/cursor)
- Broadcast : Via StreamBroadcastService vers les clients SSE

## Conclusion

Si tu vois ce texte apparaître progressivement dans l'éditeur, le streaming fonctionne ! 🎉
"

# Diviser le texte en chunks de ~50 caractères
CHUNK_SIZE=50
CHUNKS=()
for ((i=0; i<${#TEXT}; i+=CHUNK_SIZE)); do
  CHUNKS+=("${TEXT:$i:$CHUNK_SIZE}")
done

echo "📦 Nombre de chunks à envoyer: ${#CHUNKS[@]}"
echo ""

# Envoyer chaque chunk
for i in "${!CHUNKS[@]}"; do
  CHUNK="${CHUNKS[$i]}"
  IS_LAST=$([ $i -eq $((${#CHUNKS[@]} - 1)) ] && echo "true" || echo "false")
  
  # Échapper les caractères spéciaux pour JSON
  CHUNK_ESCAPED=$(echo "$CHUNK" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  
  if [ "$IS_LAST" = "true" ]; then
    PAYLOAD="{\"chunk\":\"${CHUNK_ESCAPED}\",\"position\":\"end\",\"end\":true,\"metadata\":{\"tool_call_id\":\"test-$(date +%s)\",\"agent_id\":\"test-script\",\"source\":\"test-streaming-write\"}}"
  else
    PAYLOAD="{\"chunk\":\"${CHUNK_ESCAPED}\",\"position\":\"end\",\"metadata\":{\"tool_call_id\":\"test-$(date +%s)\",\"agent_id\":\"test-script\",\"source\":\"test-streaming-write\"}}"
  fi
  
  echo "📤 Envoi chunk $((i+1))/${#CHUNKS[@]} (${#CHUNK} chars)$([ "$IS_LAST" = "true" ] && echo " [FIN]")"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${PAYLOAD}")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 202 ]; then
    echo "  ✅ Succès (HTTP $HTTP_CODE)"
  else
    echo "  ❌ Erreur (HTTP $HTTP_CODE): $BODY"
    exit 1
  fi
  
  # Délai entre les chunks (simulation du streaming)
  if [ "$IS_LAST" != "true" ]; then
    sleep 0.1
  fi
done

echo ""
echo "✅ Test terminé ! ${#CHUNKS[@]} chunks envoyés avec succès."
echo "👀 Vérifie l'éditeur/canvas pour voir le texte apparaître en temps réel."

