# XAI Voice - Problème et Solution WebSocket Proxy

## 🔴 Le Problème Concret

### Situation Actuelle

```
[Navigateur] --(WebSocket direct)--> [api.x.ai] ❌ BLOQUÉ
```

**Pourquoi ça ne marche pas ?**

Les navigateurs (Chrome, Firefox, Safari) bloquent les connexions WebSocket directes aux APIs externes pour des raisons de sécurité :
- **CORS/SOP (Same-Origin Policy)** : Les navigateurs empêchent les connexions vers des domaines différents
- **Sécurité réseau** : Protection contre les attaques et fuites de données
- **Headers HTTP** : Les WebSockets navigateur ne permettent pas d'envoyer des headers personnalisés (comme `Authorization`)

### Ce Qu'on Essaie de Faire (Actuellement)

```javascript
// Dans le navigateur (client)
const ws = new WebSocket('wss://api.x.ai/v1/realtime?token=...');
// ❌ Erreur 1006 : Connexion refusée par le navigateur/serveur
```

## ✅ La Solution : Proxy WebSocket

### Architecture Nécessaire

```
[Navigateur] --(WebSocket)--> [Notre Serveur Next.js] --(WebSocket)--> [api.x.ai]
               ✅ Autorisé                    ✅ Avec API Key XAI
```

### Comment Ça Fonctionne

1. **Le client** (navigateur) se connecte à **notre serveur** via WebSocket
   - Notre serveur = même origine = autorisé ✅
   
2. **Notre serveur** se connecte à **XAI API** via WebSocket
   - Utilise l'API key XAI (jamais exposée au client) ✅
   - Headers HTTP autorisés côté serveur ✅

3. **Notre serveur** fait le pont (proxy)
   - Reçoit les messages du client → les envoie à XAI
   - Reçoit les messages de XAI → les envoie au client

## 🛠️ Implémentation

### Option 1 : Serveur WebSocket Séparé (Recommandé)

Créer un serveur Node.js dédié avec Express + `ws` :

```javascript
// server/websocket-proxy.js
const express = require('express');
const WebSocket = require('ws');
const { createServer } = require('http');

const app = express();
const server = createServer(app);

// Serveur WebSocket pour les clients
const wss = new WebSocket.Server({ server, path: '/ws/xai-voice' });

wss.on('connection', (clientWs) => {
  // Connexion du client (navigateur)
  console.log('Client connecté');
  
  // Connexion à XAI avec API key
  const xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Proxy : Client → XAI
  clientWs.on('message', (data) => {
    if (xaiWs.readyState === WebSocket.OPEN) {
      xaiWs.send(data);
    }
  });
  
  // Proxy : XAI → Client
  xaiWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
  
  // Gestion des fermetures
  clientWs.on('close', () => xaiWs.close());
  xaiWs.on('close', () => clientWs.close());
});

server.listen(3001, () => {
  console.log('WebSocket proxy server running on port 3001');
});
```

**Dans le client (navigateur) :**
```javascript
// Se connecte à NOTRE serveur, pas directement à XAI
const ws = new WebSocket('ws://localhost:3001/ws/xai-voice');
// ✅ Ça fonctionne car même origine
```

### Option 2 : Intégré dans Next.js (Plus Complexe)

Next.js ne supporte pas nativement les WebSockets, mais on peut :
- Utiliser un custom server
- Ou utiliser un service externe (Pusher, Ably, etc.)

## 📋 Ce Qu'il Faudrait Faire

### Si On Veut Implémenter Maintenant

1. **Créer un serveur WebSocket séparé**
   - Nouveau fichier : `server/xai-voice-proxy.js`
   - Utilise `ws` (déjà dans les dépendances via Supabase)
   - Écoute sur un port différent (ex: 3001)

2. **Modifier le client**
   - Changer l'URL WebSocket dans `xaiVoiceService.ts`
   - De : `wss://api.x.ai/v1/realtime?token=...`
   - À : `ws://localhost:3001/ws/xai-voice` (dev) ou `wss://votre-domaine.com/ws/xai-voice` (prod)

3. **Déploiement**
   - Le serveur proxy doit tourner en parallèle de Next.js
   - En production : même serveur ou service séparé

### Si On Veut Attendre

- Garder le code actuel (il est correct)
- Documenter qu'il nécessite un proxy
- Implémenter le proxy plus tard quand nécessaire

## 🎯 Résumé

**Le problème :** Les navigateurs bloquent les WebSockets directs vers XAI

**La solution :** Créer un proxy WebSocket serveur qui fait le pont

**Faut-il le faire maintenant ?** 
- Pour un MVP : Non, on peut attendre
- Pour la production : Oui, c'est nécessaire

**Le code actuel :** 
- ✅ Correct et prêt
- ✅ Fonctionnera dès qu'on aura le proxy
- ✅ Pas besoin de le réécrire

## Références

- [XAI Cookbook - Exemples de proxy](https://github.com/xai-org/cookbook)
- [WebSocket Browser Limitations](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)

