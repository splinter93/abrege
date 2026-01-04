# Guide de déploiement du proxy XAI Voice

## Options de déploiement

### 1. Railway (Recommandé pour débuter)

**Avantages :**
- ✅ Support WebSocket natif
- ✅ Déploiement Git-based simple
- ✅ Variables d'environnement faciles
- ✅ Scaling automatique
- ✅ Logs intégrés

**Coût :** ~$5-20/mois selon usage

**Configuration :**

1. **Créer un projet Railway**
   ```bash
   # Installer Railway CLI (optionnel)
   npm i -g @railway/cli
   railway login
   ```

2. **Créer `railway.json`** (à la racine du projet)
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install"
     },
     "deploy": {
       "startCommand": "tsx server/xai-voice-proxy/server.ts",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

3. **Variables d'environnement Railway :**
   ```
   XAI_API_KEY=sk-...
   XAI_VOICE_PROXY_PORT=3001
   NODE_ENV=production
   ```

4. **Mettre à jour le client** (`.env.local` ou `.env.production`)
   ```
   NEXT_PUBLIC_XAI_VOICE_PROXY_URL=wss://scrivia-proxy.up.railway.app/ws/xai-voice
   ```

5. **Déployer :**
   - Via Railway Dashboard : Connecter le repo GitHub
   - Via CLI : `railway up`

**Note :** Railway assigne automatiquement un port via `$PORT`. Modifier `server.ts` pour utiliser `process.env.PORT || process.env.XAI_VOICE_PROXY_PORT || 3001`.

---

### 2. Render (Alternative gratuite)

**Avantages :**
- ✅ Plan gratuit disponible
- ✅ Support WebSocket
- ✅ Déploiement Git-based

**Configuration :**

1. Créer un nouveau **Web Service** sur Render
2. Connecter le repo GitHub
3. **Build Command :** `npm install`
4. **Start Command :** `tsx server/xai-voice-proxy/server.ts`
5. **Environment Variables :**
   ```
   XAI_API_KEY=sk-...
   PORT=10000
   NODE_ENV=production
   ```
6. **Health Check Path :** `/ws/xai-voice` (optionnel)

**Limite plan gratuit :** 750h/mois, peut s'éteindre après inactivité.

---

### 3. Fly.io (Alternative performante)

**Avantages :**
- ✅ Excellent pour WebSocket
- ✅ Pricing compétitif
- ✅ Edge computing

**Configuration :**

1. Installer Fly CLI : `curl -L https://fly.io/install.sh | sh`
2. Créer `fly.toml` :
   ```toml
   app = "votre-proxy-xai"
   primary_region = "cdg"  # Paris

   [build]
     builder = "paketobuildpacks/builder:base"

   [env]
     PORT = "8080"
     NODE_ENV = "production"

   [[services]]
     internal_port = 8080
     protocol = "tcp"
     [[services.ports]]
       port = 80
       handlers = ["http"]
     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

3. Déployer : `fly deploy`

---

### 4. Même serveur que Next.js (VPS/VM)

Si votre Next.js est déployé sur un VPS (ex: DigitalOcean, Hetzner), vous pouvez faire tourner le proxy sur le même serveur.

**Configuration :**

1. Utiliser `pm2` ou `systemd` pour gérer le processus
2. Configurer un reverse proxy (Nginx) pour router `/ws/xai-voice` vers le proxy
3. Variables d'environnement dans `.env` du serveur

**Exemple Nginx :**
```nginx
location /ws/xai-voice {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Modifications nécessaires dans le code

### 1. Adapter `server.ts` pour Railway/Render

Railway et Render utilisent `$PORT` au lieu de `XAI_VOICE_PROXY_PORT`. Modifier :

```typescript
// server/xai-voice-proxy/server.ts
const port = parseInt(process.env.PORT || process.env.XAI_VOICE_PROXY_PORT || '3001', 10);
```

### 2. Mettre à jour l'URL du client

Dans `.env.production` ou via les variables d'environnement de votre plateforme Next.js :

```
NEXT_PUBLIC_XAI_VOICE_PROXY_URL=wss://scrivia-proxy.up.railway.app/ws/xai-voice
```

---

## Checklist de déploiement

- [ ] Variables d'environnement configurées (`XAI_API_KEY`, `PORT`)
- [ ] URL du proxy mise à jour côté client (`NEXT_PUBLIC_XAI_VOICE_PROXY_URL`)
- [ ] `server.ts` utilise `process.env.PORT` en priorité
- [ ] Logs vérifiés pour confirmer le démarrage
- [ ] Test de connexion WebSocket depuis le client
- [ ] Monitoring configuré (optionnel)

---

## Dépannage

### Le proxy ne démarre pas
- Vérifier les logs Railway/Render
- Vérifier que `XAI_API_KEY` est bien configurée
- Vérifier que le port est correctement configuré

### Connexion WebSocket échoue
- Vérifier que l'URL utilise `wss://` (pas `ws://`) en production
- Vérifier que le chemin `/ws/xai-voice` est correct
- Vérifier les CORS si nécessaire (normalement pas besoin pour WebSocket)

### Latence élevée
- Vérifier la région du serveur (choisir proche des utilisateurs)
- Considérer Fly.io pour edge computing
- Vérifier la latence réseau entre client et proxy

---

## Recommandation finale

**Pour débuter :** Railway (facilité) ou Render (gratuit)
**Pour production :** Railway ou Fly.io selon budget
**Pour contrôle total :** VPS avec Nginx reverse proxy

