# Explication : Streaming vs Endpoint Classique

## 🎯 Endpoint Classique (À UTILISER NORMALEMENT)

**Endpoint** : `POST /api/v2/note/{ref}/content:apply`

**Payload normal** :
```json
{
  "ops": [{
    "id": "op-123",
    "action": "insert",
    "target": {
      "type": "position",
      "position": { "mode": "end" }
    },
    "where": "at",
    "content": "Ton texte complet ici, pas besoin de chunks !"
  }]
}
```

**✅ C'est ce que le LLM doit utiliser normalement.**

---

## 🌊 Streaming (OPTIONNEL - Juste pour l'affichage progressif)

**Endpoint** : `POST /api/v2/note/{ref}/stream:write`

**Les "chunks"** = petits morceaux de texte envoyés progressivement pour l'affichage en temps réel.

**Exemple** :
```json
// Chunk 1
{ "chunk": "Hello ", "position": "end" }

// Chunk 2
{ "chunk": "world", "position": "end" }

// Chunk 3 (fin)
{ "chunk": "!", "position": "end", "end": true }
```

**⚠️ C'est juste pour l'UX (voir le texte apparaître progressivement).**

**Le LLM n'a PAS besoin d'utiliser ça.** Il peut utiliser l'endpoint classique directement.

---

## 🔧 Pourquoi le streaming ne s'affiche pas ?

Le streaming nécessite :
1. ✅ Envoi des chunks via `POST /stream:write` (ça marche)
2. ❓ Écoute SSE via `GET /stream:listen` (à vérifier)
3. ❓ Hook `useEditorStreamListener` actif (à vérifier)

**Si ça ne marche pas, utilise juste l'endpoint classique qui fonctionne déjà !**

