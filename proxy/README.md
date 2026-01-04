# XAI Voice Proxy

Service standalone pour le proxy WebSocket XAI Voice.

## Structure

- `src/` - Code source du proxy
- `package.json` - Dépendances Node.js
- `tsconfig.json` - Configuration TypeScript
- `Dockerfile` - Configuration Docker pour déploiement
- `railway.json` - Configuration Railway

## Déploiement Railway

1. Créer un nouveau service Railway
2. Root Directory : `proxy`
3. Variable d'environnement : `XAI_API_KEY` (requis)
4. Railway détectera automatiquement le Dockerfile et déploiera

## Développement local

```bash
cd proxy
npm install
npm run dev
```

## Variables d'environnement

- `XAI_API_KEY` (requis) - Clé API XAI
- `PORT` (optionnel) - Port d'écoute (défaut: 3001)
- `NODE_ENV` (optionnel) - Environnement (production/development)

