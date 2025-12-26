#!/bin/bash

# Test d'écriture en streaming avec API Key
# Usage: ./scripts/test-streaming-api-key.sh [noteId]

API_KEY="scrivia_6d922e3faba9cf67937e6036ffa78be42c03f7c6fa7075c994dd42bb38ac53f7"
NOTE_ID="${1:-d1f3f3d5-c308-49ed-838d-7e00939dfb85}"
BASE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/v2/note/${NOTE_ID}/stream:write"

echo "🧪 Test d'écriture en streaming avec API Key"
echo "📝 Note ID: ${NOTE_ID}"
echo "🔑 API Key: ${API_KEY:0:20}..."
echo ""

# Fonction pour envoyer un chunk
send_chunk() {
  local chunk="$1"
  local is_end="${2:-false}"
  local chunk_num="$3"
  local total="$4"
  
  local payload
  if [ "$is_end" = "true" ]; then
    payload="{\"chunk\":\"${chunk}\",\"position\":\"end\",\"end\":true,\"metadata\":{\"tool_call_id\":\"test-${chunk_num}\",\"agent_id\":\"test-script\"}}"
  else
    payload="{\"chunk\":\"${chunk}\",\"position\":\"end\",\"metadata\":{\"tool_call_id\":\"test-${chunk_num}\",\"agent_id\":\"test-script\"}}"
  fi
  
  echo "📤 Chunk ${chunk_num}/${total}..."
  
  local response=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d "${payload}")
  
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 202 ]; then
    echo "  ✅ Succès (HTTP $http_code)"
    return 0
  else
    echo "  ❌ Erreur (HTTP $http_code): $body"
    return 1
  fi
}

# Chunks de test
chunks=(
  "🧪 Test d'écriture en streaming\n\n"
  "Ceci est un test pour vérifier que le streaming fonctionne correctement.\n\n"
  "## Chunks envoyés\n\n1. Premier chunk ✅\n2. Deuxième chunk ✅\n3. Troisième chunk ✅\n\n"
  "## Résultat\n\nSi tu vois ce texte apparaître progressivement dans l'éditeur/canvas, le streaming fonctionne ! 🎉\n\n"
  "✅ Test terminé avec succès !"
)

total=${#chunks[@]}

# Envoyer chaque chunk
for i in "${!chunks[@]}"; do
  chunk="${chunks[$i]}"
  is_end=$([ $i -eq $((${#chunks[@]} - 1)) ] && echo "true" || echo "false")
  
  # Échapper les caractères spéciaux pour JSON
  chunk_escaped=$(echo "$chunk" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  
  send_chunk "$chunk_escaped" "$is_end" "$((i+1))" "$total" || exit 1
  
  # Délai entre les chunks (sauf pour le dernier)
  if [ "$is_end" != "true" ]; then
    sleep 0.3
  fi
done

echo ""
echo "✅ Test terminé ! ${total} chunks envoyés avec succès."
echo "👀 Vérifie l'éditeur/canvas pour voir le texte apparaître en temps réel."
echo "   URL: ${BASE_URL}/private/note/${NOTE_ID}"

