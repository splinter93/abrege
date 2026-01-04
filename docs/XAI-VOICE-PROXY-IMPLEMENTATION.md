# Implémentation WebSocket Proxy XAI Voice

## Vue d'ensemble

Ce document décrit l'implémentation du serveur WebSocket proxy pour l'API XAI Voice, permettant aux clients navigateurs de se connecter à XAI via notre serveur intermédiaire.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌──────────┐
│  Navigateur │ ──WS──> │  Proxy Server    │ ──WS──> │ XAI API  │
│  (Client)   │         │  (:3001)         │         │          │
└─────────────┘         └──────────────────┘         └──────────┘
   ✅ Même origine          ✅ API Key serveur
```

### Flux de données

1. **Client → Proxy** : Le navigateur se connecte à notre proxy (même origine)
2. **Proxy → XAI** : Le proxy établit une connexion avec XAI en utilisant l'API key serveur
3. **Proxy bidirectionnel** : Les messages sont relayés dans les deux sens

## Structure des fichiers

```
server/
  └── xai-voice-proxy/
      ├── server.ts              # Point d'entrée serveur
      ├── types.ts               # Types TypeScript stricts
      ├── XAIVoiceProxyService.ts # Service singleton
      ├── errorHandler.ts        # Gestion d'erreurs centralisée
      └── __tests__/
          └── server.test.ts     # Tests unitaires
```

## Démarrage

### Développement

**Option 1 : Serveurs séparés (recommandé)**
```bash
# Terminal 1 : Next.js
npm run dev

# Terminal 2 : Proxy WebSocket
npm run dev:proxy
```

**Option 2 : Serveurs ensemble**
```bash
npm run dev:all
```

Le proxy démarre sur le port **3001** par défaut (configurable via `XAI_VOICE_PROXY_PORT`).

### Production

Le proxy doit être déployé séparément de Next.js :
- Service dédié (Docker, PM2, systemd)
- Ou intégré dans un serveur Node.js personnalisé

## Configuration

### Variables d'environnement

**Serveur (obligatoire)**
- `XAI_API_KEY` : Clé API XAI (déjà dans SERVER_ENV)
- `XAI_VOICE_PROXY_PORT` : Port du proxy (défaut: 3001, optionnel)

**Client (optionnel)**
- `NEXT_PUBLIC_XAI_VOICE_PROXY_URL` : URL du proxy (défaut: `ws://localhost:3001/ws/xai-voice`)

### Exemple `.env.local`

```bash
# Serveur
XAI_API_KEY=xai-your-api-key-here
XAI_VOICE_PROXY_PORT=3001

# Client (dev)
NEXT_PUBLIC_XAI_VOICE_PROXY_URL=ws://localhost:3001/ws/xai-voice

# Client (production)
NEXT_PUBLIC_XAI_VOICE_PROXY_URL=wss://yourdomain.com/ws/xai-voice
```

## Utilisation

### Côté client

Le service `XAIVoiceService` a été modifié pour utiliser le proxy au lieu d'une connexion directe :

```typescript
// Avant (ne fonctionnait pas)
const ws = new WebSocket('wss://api.x.ai/v1/realtime?token=...');

// Après (fonctionne)
const ws = new WebSocket('ws://localhost:3001/ws/xai-voice');
```

Le composant `XAIVoiceChat` fonctionne sans modification - il utilise automatiquement le proxy.

## Architecture Technique

### Service Singleton

Le `XAIVoiceProxyService` suit le pattern singleton utilisé dans le projet :
- Instance unique partagée
- Gestion d'état centralisée (Map des connexions)
- Méthodes : `start()`, `stop()`, `handleClientConnection()`, etc.

### Gestion des connexions

- **Map des connexions actives** : `Map<connectionId, ActiveConnection>`
- **Cleanup automatique** : Fermeture propre lors des déconnexions
- **Ping/Pong** : Maintien des connexions (intervalle configurable)
- **Timeout de connexion** : 10 secondes par défaut

### Gestion d'erreurs

3 niveaux conformes au GUIDE D'EXCELLENCE :

1. **Catch spécifique** : Erreurs typées (`ProxyConnectionError`, `XAIAPIError`)
2. **Fallback gracieux** : Gestion des erreurs génériques
3. **User-facing** : Messages d'erreur via WebSocket close

## Tests

### Exécution

```bash
npm test -- server/xai-voice-proxy/__tests__/server.test.ts
```

### Coverage

Objectif : >80% coverage
- Tests unitaires pour le service
- Tests d'intégration pour les connexions
- Tests de concurrence (10 connexions simultanées)

## Troubleshooting

### Le proxy ne démarre pas

**Erreur : `XAI_API_KEY non configurée`**
- Vérifier que `XAI_API_KEY` est définie dans `.env.local`
- Vérifier que la variable est chargée : `echo $XAI_API_KEY`

**Erreur : `Port 3001 already in use`**
- Changer le port via `XAI_VOICE_PROXY_PORT=3002`
- Ou arrêter le processus utilisant le port : `lsof -ti:3001 | xargs kill`

### Connexions échouent

**Erreur : `Connection refused`**
- Vérifier que le proxy est démarré : `npm run dev:proxy`
- Vérifier l'URL dans `NEXT_PUBLIC_XAI_VOICE_PROXY_URL`

**Erreur : `XAI connection timeout`**
- Vérifier que `XAI_API_KEY` est valide
- Vérifier la connectivité réseau vers `api.x.ai`

### Logs

Les logs sont structurés avec `LogCategory.AUDIO` :
- Niveau INFO : Connexions, démarrage/arrêt
- Niveau ERROR : Erreurs de connexion, erreurs API
- Contexte : connectionId, operation, userId

## Sécurité

### API Key

- ✅ **Jamais exposée au client** : L'API key reste côté serveur
- ✅ **Validation au démarrage** : Fail-fast si manquante
- ✅ **Pas de logs** : L'API key n'est jamais loggée

### Connexions

- ✅ **Isolation** : Chaque connexion est isolée (Map par connectionId)
- ✅ **Cleanup** : Fermeture propre lors des erreurs
- ✅ **Timeout** : Limite le temps de connexion

### Rate Limiting (Future)

À implémenter :
- Limite de connexions par utilisateur
- Limite de messages par seconde
- Blacklist temporaire en cas d'abus

## Performance

### Optimisations

- **Map efficace** : O(1) lookup des connexions
- **Pas de polling** : Utilise les événements WebSocket natifs
- **Cleanup automatique** : Prévention des memory leaks

### Métriques

À surveiller :
- Nombre de connexions actives
- Taux d'erreurs
- Latence proxy → XAI
- Utilisation mémoire

## Déploiement Production

### Option 1 : Service séparé (Recommandé)

Créer un service systemd ou Docker :

```dockerfile
# Dockerfile (exemple)
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY server/ ./server/
COPY src/config/ ./src/config/
COPY src/utils/ ./src/utils/
CMD ["npm", "run", "dev:proxy"]
```

### Option 2 : PM2

```bash
pm2 start "npm run dev:proxy" --name xai-voice-proxy
```

### Option 3 : Intégration Next.js Custom Server

Pour intégrer dans Next.js, créer un custom server (voir documentation Next.js).

## Prochaines améliorations

1. **Rate limiting** : Limiter les connexions par utilisateur
2. **Monitoring** : Métriques et alertes (Prometheus, Grafana)
3. **Health check** : Endpoint `/health` pour vérifier l'état
4. **Redis** : Partage d'état entre instances (scale horizontal)
5. **Authentication** : Validation JWT des connexions clients

## Références

- [Documentation XAI Voice API](https://docs.x.ai/docs/guides/voice)
- [ws Library Documentation](https://github.com/websockets/ws)
- [GUIDE D'EXCELLENCE](./GUIDE-EXCELLENCE-CODE.md)

