# Test d'écriture en streaming

## Récupérer le token JWT

### Depuis le navigateur (console)

```javascript
// Dans la console du navigateur (F12)
JSON.parse(localStorage.getItem('sb-localhost-auth-token')).access_token
```

### Depuis l'application

Le token est stocké dans `localStorage` avec la clé `sb-localhost-auth-token` (ou similaire selon votre configuration Supabase).

## Test rapide avec curl

```bash
# 1. Récupérer le token (depuis la console du navigateur)
TOKEN="votre_token_ici"

# 2. Tester l'envoi d'un chunk
curl -X POST "http://localhost:3000/api/v2/note/d1f3f3d5-c308-49ed-838d-7e00939dfb85/stream:write" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "chunk": "Hello from streaming test! ",
    "position": "end",
    "metadata": {
      "tool_call_id": "test-123",
      "agent_id": "test-script"
    }
  }'

# 3. Envoyer plusieurs chunks (simulation streaming)
for i in {1..5}; do
  curl -X POST "http://localhost:3000/api/v2/note/d1f3f3d5-c308-49ed-838d-7e00939dfb85/stream:write" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"chunk\":\"Chunk $i... \",\"position\":\"end\"}"
  sleep 0.2
done

# 4. Envoyer le chunk final
curl -X POST "http://localhost:3000/api/v2/note/d1f3f3d5-c308-49ed-838d-7e00939dfb85/stream:write" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "chunk": "Fin du test !",
    "position": "end",
    "end": true
  }'
```

## Test avec le script Node.js

```bash
# Avec token en argument
node scripts/test-streaming-write.js d1f3f3d5-c308-49ed-838d-7e00939dfb85 "votre_token"

# Avec token en variable d'environnement
JWT_TOKEN="votre_token" node scripts/test-streaming-write.js
```

## Test avec le script bash

```bash
./scripts/test-streaming-write.sh d1f3f3d5-c308-49ed-838d-7e00939dfb85 "votre_token"
```

## Vérification

1. Ouvre la note dans l'éditeur/canvas : `http://localhost:3000/private/note/d1f3f3d5-c308-49ed-838d-7e00939dfb85`
2. Exécute le test
3. Le texte doit apparaître progressivement dans l'éditeur/canvas

## Dépannage

- **401 Unauthorized** : Vérifie que le token est valide et non expiré
- **404 Not Found** : Vérifie que la note existe et que tu as les permissions
- **429 Too Many Requests** : Rate limit atteint, attends quelques secondes
- **Rien n'apparaît** : Vérifie que l'éditeur/canvas écoute bien le stream (`useEditorStreamListener` ou `useNoteStreamListener` actif)

