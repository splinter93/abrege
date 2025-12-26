#!/bin/bash
# Test SIMPLE avec l'endpoint CLASSIQUE (celui qui marche déjà)

API_KEY="scrivia_6d922e3faba9cf67937e6036ffa78be42c03f7c6fa7075c994dd42bb38ac53f7"
NOTE_ID="${1:-d1f3f3d5-c308-49ed-838d-7e00939dfb85}"
BASE_URL="http://localhost:3000"

echo "🧪 Test avec l'endpoint CLASSIQUE (celui qui marche)"
echo "📝 Note ID: ${NOTE_ID}"
echo ""

# Payload NORMAL - pas de chunks, juste du texte
curl -X POST "${BASE_URL}/api/v2/note/${NOTE_ID}/content:apply" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "ops": [{
      "id": "test-'$(date +%s)'",
      "action": "insert",
      "target": {
        "type": "position",
        "position": {
          "mode": "end"
        }
      },
      "where": "at",
      "content": "\n\n## ✅ Test réussi !\n\nL'\''endpoint classique fonctionne parfaitement.\n\n**Pas besoin de chunks ou de streaming compliqué.**\n\nLe LLM peut utiliser cet endpoint directement avec un payload normal."
    }]
  }' | jq '.data.ops_results[0].status'

echo ""
echo "✅ C'\''est tout ! Vérifie la note dans l'\''éditeur."

