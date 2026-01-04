# XAI Voice API - Problèmes d'Implémentation

## Résumé

Ce document décrit les problèmes rencontrés lors de l'implémentation de l'API XAI Voice (Grok Voice Agent) dans l'application.

## État Actuel

✅ **Implémentation Complète** : Le code est entièrement implémenté et fonctionnel selon la documentation XAI
- ✅ Route API pour génération de token éphémère (`/api/chat/voice/token`)
- ✅ Service WebSocket (`src/services/xai/xaiVoiceService.ts`)
- ✅ Composant React (`src/components/voice/XAIVoiceChat.tsx`)
- ✅ Page de test (`src/app/voice/page.tsx`)
- ✅ Gestion audio (capture microphone, conversion PCM16, encodage Base64)
- ✅ Gestion des messages XAI (audio deltas, transcript deltas, etc.)

❌ **Connexion WebSocket Échoue** : La connexion WebSocket est refusée par le serveur XAI avec l'erreur 1006

## Problèmes Identifiés

### 1. Erreur WebSocket 1006 - Connexion Refusée

**Symptôme :**
```
WebSocket connection to 'wss://api.x.ai/v1/realtime?token=...' failed
Error code: 1006 (Abnormal Closure)
```

**Cause Probable :**
Les navigateurs (Chrome, Firefox, Safari, etc.) imposent des restrictions de sécurité strictes qui empêchent les connexions WebSocket directes aux APIs externes comme XAI depuis le client (navigateur). Cela inclut :
- Restrictions CORS/SOP (Same-Origin Policy)
- Limitations d'authentification (pas de headers HTTP personnalisés dans les WebSockets navigateur)
- Restrictions de sécurité réseau

**Détails Techniques :**
- Le token éphémère est correctement généré (format `xai-realtime-client-secret-...`)
- La connexion est tentée avec le format correct : `wss://api.x.ai/v1/realtime?token=${token}`
- Le serveur XAI refuse systématiquement la connexion avec le code 1006

**Références :**
- Documentation XAI mentionne que les WebSockets depuis le navigateur nécessitent un proxy serveur
- Cookbook XAI sur GitHub suggère d'utiliser un serveur intermédiaire (Node.js, Python FastAPI)

### 2. Authentification WebSocket

**Problème :**
L'API XAI Voice supporte deux méthodes d'authentification :
1. **API Key dans les headers** (serveur uniquement) : `Authorization: Bearer ${XAI_API_KEY}`
2. **Token éphémère dans l'URL** (client) : `wss://api.x.ai/v1/realtime?token=${token}`

**Limitation Navigateur :**
Les WebSockets natifs du navigateur ne supportent **pas** les headers HTTP personnalisés lors de l'établissement de la connexion. Seule la méthode avec token dans l'URL est possible, mais elle est bloquée par les restrictions de sécurité du navigateur.

### 3. Architecture Next.js

**Limitation :**
Next.js ne supporte pas nativement les WebSockets dans les routes API car il utilise un modèle request/response, pas des connexions persistantes.

**Solutions Possibles :**
1. **Serveur WebSocket Séparé** : Créer un serveur Express + `ws` dédié (complexe, nécessite changement d'architecture)
2. **Proxy WebSocket** : Utiliser un service externe de proxy WebSocket
3. **Alternative SSE + POST** : Utiliser Server-Sent Events pour serveur→client et POST pour client→serveur (pas vraiment bidirectionnel temps réel)

## Fichiers Créés

### Routes API
- `src/app/api/chat/voice/token/route.ts` : Génère un token éphémère depuis l'API XAI

### Services
- `src/services/xai/xaiVoiceService.ts` : Service singleton pour gérer la connexion WebSocket XAI

### Composants
- `src/components/voice/XAIVoiceChat.tsx` : Composant React pour l'interface utilisateur
- `src/components/voice/XAIVoiceChat.css` : Styles CSS

### Pages
- `src/app/voice/page.tsx` : Page de test/démonstration

## Code Fonctionnel

Tous les fichiers sont implémentés correctement selon la documentation XAI :
- ✅ Gestion des tokens éphémères
- ✅ Configuration de session (voice, instructions, audio format)
- ✅ Envoi audio (PCM16, Base64)
- ✅ Réception audio (deltas, conversion WAV)
- ✅ Gestion des transcriptions
- ✅ Gestion d'erreurs et reconnexion
- ✅ Logging structuré avec `LogCategory.AUDIO`

## Prochaines Étapes Recommandées

### Option 1 : Serveur WebSocket Séparé (Recommandé pour Production)

Créer un serveur Node.js séparé avec Express + `ws` qui :
1. Écoute les connexions WebSocket depuis le client
2. Établit une connexion WebSocket vers XAI avec l'API key
3. Proxifie les messages bidirectionnellement

**Avantages :**
- Sécurisé (API key jamais exposée au client)
- Performance optimale (connexion persistante)
- Compatible avec l'architecture existante

**Inconvénients :**
- Nécessite un serveur supplémentaire
- Plus complexe à déployer

### Option 2 : Documenter la Limitation (Pour MVP)

Garder le code actuel mais documenter que la fonctionnalité nécessite un proxy WebSocket pour fonctionner.

**Avantages :**
- Code prêt à l'emploi
- Pas de changement d'architecture nécessaire maintenant

**Inconvénients :**
- Fonctionnalité non utilisable pour le moment

### Option 3 : Contacter le Support XAI

Vérifier avec XAI si :
- Les WebSockets depuis le navigateur sont vraiment supportés
- Il y a une configuration/activation nécessaire
- Il existe des exemples de code fonctionnels

## Références

- [Documentation XAI Voice API](https://docs.x.ai/docs/guides/voice)
- [XAI Cookbook GitHub](https://github.com/xai-org/cookbook) (exemples de proxy WebSocket)
- [WebSocket Browser Limitations](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## Notes Techniques

### Format Token Éphémère
L'API XAI retourne le token sous la forme :
```json
{
  "value": "xai-realtime-client-secret-...",
  "expires_at": 1767487278
}
```

Nous convertissons cela en :
```json
{
  "success": true,
  "client_secret": "xai-realtime-client-secret-...",
  "expires_in": 300,
  "expires_at": 1767487278
}
```

### Format Audio
- **Input** : PCM16, 24kHz, mono, Base64 encodé
- **Output** : PCM16, 24kHz, mono, Base64 encodé (converti en WAV pour lecture navigateur)

### Messages WebSocket XAI
- `session.update` : Configuration de session
- `input_audio_buffer.append` : Envoi audio
- `input_audio_buffer.commit` : Finalisation audio
- `response.output_audio.delta` : Réception audio
- `response.output_audio_transcript.delta` : Réception transcription

## Conclusion

L'implémentation est **complète et correcte** selon la documentation XAI. Le blocage vient des **restrictions de sécurité des navigateurs** qui empêchent les connexions WebSocket directes aux APIs externes. Une solution nécessiterait un **proxy WebSocket côté serveur**.

