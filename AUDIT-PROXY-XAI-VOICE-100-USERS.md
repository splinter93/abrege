# Audit Proxy XAI Voice - Prêt pour 100 utilisateurs ?

**Date** : 2026-01-04  
**Objectif** : Vérifier si le proxy peut gérer 100 utilisateurs simultanés  
**Conclusion** : ⚠️ **PROBLÈMES CRITIQUES IDENTIFIÉS** - Pas prêt tel quel

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **Limite `maxConnections` non appliquée**

**Problème** : `maxConnections: 100` est défini dans la config mais **jamais vérifié** lors de nouvelles connexions.

**Code actuel** (`proxy/src/server.ts:35`) :
```typescript
maxConnections: 100, // Limite par défaut
```

**Code manquant** dans `handleClientConnection()` :
- Aucune vérification de `this.connectionManager.count() < this.config.maxConnections`
- Le proxy peut accepter un nombre illimité de connexions
- Risque de dépassement mémoire/CPU

**Impact** : 
- ❌ Memory leak potentiel
- ❌ Pas de protection contre le surchargement
- ❌ Pas de rate limiting

**Fix requis** :
```typescript
private handleClientConnection(clientWs: WebSocket): void {
  // Vérifier la limite AVANT d'accepter la connexion
  const currentConnections = this.connectionManager.count();
  if (this.config.maxConnections && currentConnections >= this.config.maxConnections) {
    logger.warn(LogCategory.AUDIO, '[XAIVoiceProxyService] Limite de connexions atteinte', {
      current: currentConnections,
      max: this.config.maxConnections
    });
    clientWs.close(1008, 'Too many connections');
    return;
  }
  // ... reste du code
}
```

---

### 2. **Pas de cleanup des connexions inactives**

**Problème** : Aucun mécanisme pour fermer les connexions inactives.

**Scénario** :
- User se connecte puis ferme l'onglet sans fermer proprement le WebSocket
- La connexion reste dans la Map
- `pingInterval` continue de tourner
- Connexion XAI reste ouverte

**Impact** :
- ❌ Memory leak progressif
- ❌ Ressources gaspillées (100 connexions zombies = 200 WebSocket inutiles)
- ❌ Après quelques heures, le proxy peut être saturé

**Fix requis** : Implémenter un heartbeat timeout
```typescript
// Dans handleClientConnection, après le pingInterval
const heartbeatTimeout = setTimeout(() => {
  const conn = this.connectionManager.get(connectionId);
  if (conn && Date.now() - conn.metadata.lastActivity > 60000) { // 60s sans activité
    logger.warn(LogCategory.AUDIO, '[XAIVoiceProxyService] Connexion inactive fermée', { connectionId });
    this.closeConnection(connectionId, 1001, 'Connection timeout');
  }
}, 60000);
```

---

### 3. **MessageQueue sans limite de taille**

**Problème** : `messageQueue: string[]` n'a pas de limite, peut grossir indéfiniment.

**Code actuel** (`proxy/src/connectionTypes.ts:17`) :
```typescript
messageQueue: string[]; // Queue (text frames) pour les messages reçus avant connexion XAI
```

**Scénario problématique** :
- Client envoie des messages avant que la connexion XAI soit établie
- Si XAI est lent à se connecter (>10s timeout), la queue peut grossir
- Messages audio = ~1-10KB chacun
- 100 messages = 1MB par connexion
- 100 connexions = 100MB de queue totale

**Impact** :
- ❌ Memory leak si connexion XAI échoue
- ❌ Pas de protection contre spam

**Fix requis** : Limiter la taille de la queue
```typescript
messageQueue: string[];
maxQueueSize?: number; // Ajouter dans ActiveConnection

// Dans handleClientMessage
if (connection.messageQueue.length >= (connection.maxQueueSize || 50)) {
  logger.warn(LogCategory.AUDIO, '[XAIVoiceProxyService] Queue pleine, rejet message', { connectionId });
  return;
}
```

---

### 4. **Pas de monitoring/métriques**

**Problème** : Aucun endpoint de health check ou métriques.

**Impact** :
- ❌ Impossible de monitorer le nombre de connexions actives
- ❌ Impossible de détecter les problèmes en production
- ❌ Pas de alertes si le proxy est saturé

**Fix requis** : Ajouter un endpoint HTTP de health check
```typescript
// Dans server.ts
import { createServer } from 'http';

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    const service = XAIVoiceProxyService.getInstance(config);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connections: service.getActiveConnectionsCount(),
      maxConnections: config.maxConnections
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
```

---

## 🟡 PROBLÈMES MOYENS

### 5. **Pas de rate limiting**

**Problème** : Aucune protection contre les connexions abusives.

**Impact** :
- ⚠️ Un seul user peut ouvrir 100 connexions et saturer le proxy
- ⚠️ Pas de protection DDoS basique

**Recommandation** : Implémenter un rate limiter (par IP ou par user_id si disponible)

---

### 6. **Configuration Railway non vérifiée**

**Problème** : Pas d'info sur les ressources allouées sur Railway.

**Questions à vérifier** :
- Quelle mémoire est allouée ? (512MB, 1GB, 2GB ?)
- Quel CPU ? (0.5 vCPU, 1 vCPU ?)
- Auto-scaling activé ?

**Recommandation** :
- Minimum 1GB RAM pour 100 connexions
- 1 vCPU recommandé
- Monitoring Railway activé

---

### 7. **Pas de retry logic pour connexions XAI**

**Problème** : Si XAI API est temporairement indisponible, toutes les nouvelles connexions échouent.

**Impact** :
- ⚠️ Pas de résilience face aux pannes XAI
- ⚠️ Expérience utilisateur dégradée

**Recommandation** : Implémenter retry avec backoff exponentiel (optionnel, peut être fait plus tard)

---

## ✅ POINTS POSITIFS

1. **Architecture modulaire** : Code bien structuré, facile à maintenir
2. **Gestion d'erreurs** : 3 niveaux conformes au GUIDE
3. **Graceful shutdown** : Arrêt propre des connexions
4. **Ping/Pong** : Maintien des connexions actives
5. **TypeScript strict** : Pas de `any`, types bien définis
6. **Logging structuré** : Facile à débugger
7. **ConnectionManager** : Map O(1) pour performances

---

## 📊 ESTIMATION RESSOURCES (100 utilisateurs)

**Par connexion** :
- 2 WebSocket (client + XAI) = ~8KB mémoire chacun = 16KB par user
- Metadata + Queue = ~2KB par user
- **Total par user : ~18KB**

**Pour 100 users** :
- Mémoire connexions : ~1.8MB
- Node.js overhead : ~50MB
- Buffer WebSocket : ~10MB (si traffic actif)
- **Total estimé : ~62MB minimum**

**CPU** :
- WebSocket handling : ~1-5% CPU par connexion active (audio)
- 100 connexions actives = ~100-500% CPU = **1-5 vCPU nécessaires**

**Réalité Railway** :
- Plan Starter : 512MB RAM, 0.5 vCPU → **INSUFFISANT pour 100 users actifs**
- Plan Pro : 2GB RAM, 2 vCPU → **MARGINAL pour 100 users actifs**
- Plan Pro+ : 4GB RAM, 4 vCPU → **OK pour 100 users**

---

## 🔧 FIXES PRIORITAIRES (à faire avant 100 users)

### Priorité 1 (CRITIQUE - avant prod)
1. ✅ Appliquer la limite `maxConnections` (15 min)
2. ✅ Ajouter heartbeat timeout pour cleanup (30 min)
3. ✅ Limiter la taille de `messageQueue` (15 min)

### Priorité 2 (IMPORTANT - cette semaine)
4. ✅ Ajouter endpoint `/health` pour monitoring (30 min)
5. ✅ Vérifier/configurer ressources Railway (10 min)

### Priorité 3 (NICE TO HAVE - plus tard)
6. Rate limiting par IP
7. Retry logic pour XAI
8. Métriques détaillées (Prometheus/StatsD)

---

## ✅ CHECKLIST PRÊT POUR 100 USERS

- [ ] `maxConnections` appliqué et testé
- [ ] Heartbeat timeout implémenté
- [ ] `messageQueue` limité à 50 messages max
- [ ] Endpoint `/health` disponible
- [ ] Railway configuré avec 2GB RAM minimum
- [ ] Monitoring Railway activé
- [ ] Test avec 50 connexions simultanées (stress test)
- [ ] Test avec 100 connexions simultanées (stress test)
- [ ] Documentation mise à jour

---

## 🎯 RECOMMANDATION FINALE

**Statut actuel** : ⚠️ **NON PRÊT pour 100 users simultanés**

**Raisons** :
1. Limite `maxConnections` non appliquée → risque memory leak
2. Pas de cleanup connexions inactives → memory leak progressif
3. Queue illimitée → risque mémoire si XAI lent
4. Pas de monitoring → impossible de détecter problèmes

**Temps estimé pour être prêt** : 1-2 heures de dev + tests

**Après fixes** : ✅ **PRÊT pour 100 users** (avec 2GB RAM sur Railway)

---

## 📝 NOTES

- Le code est bien écrit et maintenable
- Les problèmes identifiés sont des "missing features" plutôt que des bugs
- Facile à corriger (tous les fixes sont simples)
- Architecture solide, juste besoin d'ajouter les garde-fous

