# 📊 Documentation Système de Monitoring - Scrivia

**Version :** 1.0  
**Date :** 5 janvier 2026  
**Phase :** 1.4 - Production Ready (500 users)

---

## 🎯 Objectif

Le système de monitoring Scrivia collecte, analyse et alerte automatiquement sur les performances et la santé de l'application en production. Il permet de :

- **Surveiller** les latences (P50/P95/P99), erreurs, cache hits, DB queries
- **Détecter** les anomalies (taux d'erreur élevé, latence excessive, cache dégradé)
- **Alerter** automatiquement via Slack/Email en cas de seuils dépassés
- **Analyser** les tendances pour optimiser les performances

**Conformité :** GUIDE-EXCELLENCE-CODE.md (zero any, interfaces explicites, singleton, logger structuré)

---

## 🏗️ Architecture

### Composants Principaux

```
┌─────────────────────────────────────────────────────────────┐
│                    MetricsCollector                         │
│  (Singleton) - Collecte centralisée de toutes métriques    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├──► Latence (endpoints)
                          ├──► Erreurs (par type)
                          ├──► DB Queries (par table)
                          ├──► Cache Hits (LLM, Note Embed)
                          ├──► Rate Limits (par endpoint)
                          └──► Throughput (1m, 5m, 15m)
                          │
┌─────────────────────────────────────────────────────────────┐
│                    AlertManager                             │
│  (Singleton) - Vérification seuils + envoi alertes         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├──► Vérification toutes les 30s
                          ├──► Anti-spam 5 minutes
                          └──► Envoi Slack/Email
                          │
┌─────────────────────────────────────────────────────────────┐
│                    /api/metrics                            │
│  (GET) - Endpoint JSON exposant toutes métriques           │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données

1. **Collecte** : Les routes API enregistrent automatiquement leurs métriques via `metricsCollector.recordLatency()`, `recordError()`, etc.
2. **Agrégation** : `MetricsCollector` stocke les métriques en mémoire (buffer 10K entrées, fenêtre 24h)
3. **Analyse** : `AlertManager` vérifie les seuils toutes les 30s et déclenche des alertes si nécessaire
4. **Exposition** : L'endpoint `/api/metrics` expose toutes les métriques en JSON

---

## 📁 Fichiers du Système

### Services Core

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `src/services/monitoring/MetricsCollector.ts` | 462 | Service singleton de collecte centralisée |
| `src/services/monitoring/AlertManager.ts` | 399 | Service singleton de gestion d'alertes |
| `src/app/api/metrics/route.ts` | 193 | Endpoint GET exposant toutes métriques |
| `src/utils/supabaseWithMetrics.ts` | 143 | Wrapper Supabase pour tracking DB automatique |

### Tests

| Fichier | Tests | Coverage |
|---------|-------|----------|
| `src/services/monitoring/__tests__/MetricsCollector.test.ts` | 35 | 85.81% |
| `src/services/monitoring/__tests__/AlertManager.test.ts` | 31 | 92.07% |
| `src/app/api/metrics/__tests__/route.test.ts` | 23 | 100% |

### Intégrations

Les métriques sont automatiquement collectées dans :

- **Routes Chat :**
  - `src/app/api/chat/llm/stream/route.ts` (latence + erreurs)
  - `src/app/api/chat/llm/route.ts` (latence + erreurs)

- **Routes Note :**
  - `src/app/api/v2/note/[ref]/route.ts` (latence + erreurs)

- **Cache :**
  - `src/services/cache/LLMCacheService.ts` (hit/miss)
  - `src/services/cache/NoteEmbedCacheService.ts` (hit/miss)

- **Rate Limiting :**
  - `src/middleware.ts` (hits par IP/endpoint)

---

## 🔧 Utilisation

### 1. Enregistrer une Métrique de Latence

```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let success = false;
  
  try {
    // ... votre logique ...
    success = true;
    return NextResponse.json({ data });
  } catch (error) {
    const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    metricsCollector.recordError('my/endpoint', errorType, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    const latency = Date.now() - startTime;
    metricsCollector.recordLatency('my/endpoint', latency, success);
  }
}
```

### 2. Enregistrer une Erreur

```typescript
try {
  // ... opération ...
} catch (error) {
  const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  metricsCollector.recordError('my/endpoint', errorType, errorMessage);
  throw error;
}
```

### 3. Enregistrer une Requête DB

**Automatique** si vous utilisez `supabaseWithMetrics` :

```typescript
import { createSupabaseClientWithMetrics } from '@/utils/supabaseWithMetrics';

const supabase = createSupabaseClientWithMetrics(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Toutes les queries sont automatiquement trackées
const { data } = await supabase
  .from('articles')
  .select('*')
  .eq('id', 123);
```

**Manuel** si vous utilisez le client Supabase standard :

```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

const startTime = Date.now();
const { data, error } = await supabase.from('articles').select('*');
const latency = Date.now() - startTime;

metricsCollector.recordDbQuery('articles', latency);
```

### 4. Enregistrer un Cache Hit/Miss

```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

async function getCachedData(key: string) {
  const cached = await cache.get(key);
  
  // Enregistrer hit/miss
  metricsCollector.recordCacheHit('llm', !!cached);
  
  if (cached) return cached;
  // ... fetch from source ...
}
```

### 5. Enregistrer un Rate Limit Hit

**Automatique** dans le middleware :

```typescript
// src/middleware.ts
const rateLimitResult = limiter.checkSync(clientIP);
metricsCollector.recordRateLimit(url.pathname, clientIP, !rateLimitResult.allowed);
```

---

## 📈 Récupérer les Métriques

### Via l'Endpoint API

**GET `/api/metrics`**

```bash
curl https://www.scrivia.app/api/metrics
```

**Réponse JSON :**

```json
{
  "success": true,
  "timestamp": "2026-01-05T20:00:00.000Z",
  "latency": {
    "global": {
      "p50": 150,
      "p95": 500,
      "p99": 1000,
      "average": 200,
      "count": 1000
    },
    "byEndpoint": {
      "chat/llm/stream": {
        "p50": 200,
        "p95": 800,
        "p99": 1500,
        "average": 300,
        "count": 500
      }
    }
  },
  "throughput": {
    "1m": { "messages": 50, "requests": 100 },
    "5m": { "messages": 250, "requests": 500 },
    "15m": { "messages": 750, "requests": 1500 }
  },
  "errors": {
    "global": {
      "rate": 0.02,
      "total": 20
    },
    "byType": {
      "validation_error": { "count": 10, "rate": 0.5 },
      "server_error": { "count": 10, "rate": 0.5 }
    }
  },
  "rateLimits": {
    "global": {
      "hits": 5,
      "total": 1000,
      "rate": 0.005
    },
    "byEndpoint": {
      "api": { "hits": 3, "total": 500, "rate": 0.006 },
      "chat": { "hits": 2, "total": 500, "rate": 0.004 }
    }
  },
  "cache": {
    "llm": {
      "hitRate": 0.85,
      "hits": 850,
      "misses": 150
    },
    "note_embed": {
      "hitRate": 0.90,
      "hits": 900,
      "misses": 100
    }
  },
  "database": {
    "global": {
      "p50": 50,
      "p95": 200,
      "p99": 500,
      "average": 100,
      "count": 2000
    },
    "byTable": {
      "articles": {
        "p50": 60,
        "p95": 250,
        "p99": 600,
        "average": 120,
        "count": 1000
      }
    }
  },
  "alerts": {
    "recent": [
      {
        "type": "error_rate_high",
        "severity": "warning",
        "message": "Error rate is 5.00% (threshold: 5.00%)",
        "value": 0.05,
        "threshold": 0.05,
        "timestamp": 1704480000000,
        "sent": true
      }
    ],
    "active": []
  }
}
```

### Via le Code (Programmatique)

```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

// Latence globale
const latencyStats = metricsCollector.getLatencyStats();
console.log(`P95: ${latencyStats.p95}ms, Average: ${latencyStats.average}ms`);

// Latence par endpoint
const endpointStats = metricsCollector.getLatencyStats('chat/llm/stream');
console.log(`Endpoint P95: ${endpointStats.p95}ms`);

// Taux d'erreur
const errorStats = metricsCollector.getErrorRateStats();
console.log(`Error rate: ${(errorStats.rate * 100).toFixed(2)}%`);

// Erreurs par type
Object.entries(errorStats.byType).forEach(([type, stats]) => {
  console.log(`${type}: ${stats.count} errors (${(stats.rate * 100).toFixed(2)}%)`);
});

// Throughput
const throughput1m = metricsCollector.getThroughputStats('1m');
console.log(`1m: ${throughput1m.messages} messages, ${throughput1m.requests} requests`);

// Cache hit rate
const llmCache = metricsCollector.getCacheHitRate('llm');
console.log(`LLM cache: ${(llmCache.hitRate * 100).toFixed(2)}% hit rate`);

// DB latency
const dbStats = metricsCollector.getDbLatencyStats('articles');
console.log(`DB P95: ${dbStats.p95}ms`);

// Rate limits
const rateLimitStats = metricsCollector.getRateLimitStats('api');
console.log(`Rate limit hits: ${rateLimitStats.hits}/${rateLimitStats.total} (${(rateLimitStats.rate * 100).toFixed(2)}%)`);
```

---

## 🚨 Système d'Alertes

### Configuration des Seuils

Les seuils sont définis dans `AlertManager.ts` :

```typescript
private readonly THRESHOLDS: Record<AlertType, Thresholds> = {
  error_rate_high: { warning: 0.05, critical: 0.10 },      // 5% warning, 10% critical
  latency_p95_high: { warning: 10000, critical: 20000 },    // 10s warning, 20s critical (ms)
  rate_limit_high: { warning: 0.10, critical: 0.20 },       // 10% warning, 20% critical
  db_query_slow: { warning: 1000, critical: 3000 },         // 1s warning, 3s critical (ms)
  cache_hit_rate_low: { warning: 0.50, critical: 0.30 }     // 50% warning, 30% critical
};
```

### Types d'Alertes

| Type | Description | Seuil Warning | Seuil Critical |
|------|-------------|---------------|----------------|
| `error_rate_high` | Taux d'erreur global élevé | ≥ 5% | ≥ 10% |
| `latency_p95_high` | Latence P95 élevée | ≥ 10s | ≥ 20s |
| `rate_limit_high` | Taux de hits de rate limit élevé | ≥ 10% | ≥ 20% |
| `db_query_slow` | Requêtes DB lentes (P95) | ≥ 1s | ≥ 3s |
| `cache_hit_rate_low` | Taux de cache hit faible | ≤ 50% | ≤ 30% |

### Fonctionnement

1. **Vérification automatique** : `AlertManager` vérifie les seuils toutes les 30 secondes
2. **Anti-spam** : Une alerte du même type ne peut être renvoyée qu'après 5 minutes
3. **Envoi** : Les alertes sont envoyées via :
   - **Slack** : Si `SLACK_WEBHOOK_URL` est configuré
   - **Email** : Si `ALERT_EMAIL_TO` est configuré (TODO: implémentation complète)

### Configuration Slack

```bash
# .env.production
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Format des Alertes Slack

```json
{
  "text": "🚨 Error rate is 15.00% (threshold: 10.00%)",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*CRITICAL Alert*\n🚨 Error rate is 15.00% (threshold: 10.00%)"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "Type: error_rate_high | Value: 0.15 | Threshold: 0.1 | Time: 2026-01-05T20:00:00.000Z"
        }
      ]
    }
  ]
}
```

### Récupérer les Alertes Actives

```typescript
import { alertManager } from '@/services/monitoring/AlertManager';

// Alertes actives (dernières 5 minutes)
const activeAlerts = alertManager.getActiveAlerts();
console.log(`Active alerts: ${activeAlerts.length}`);

// Alertes récentes (dernières 20)
const recentAlerts = alertManager.getRecentAlerts(20);
recentAlerts.forEach(alert => {
  console.log(`${alert.severity.toUpperCase()}: ${alert.message}`);
});
```

---

## 🔍 Métriques Disponibles

### 1. Latence

**Méthode :** `getLatencyStats(endpoint?: string)`

**Retourne :**
- `p50`, `p95`, `p99` : Percentiles de latence
- `average` : Moyenne
- `count` : Nombre de requêtes

**Fenêtre :** 24 heures (sliding window)

**Exemple :**
```typescript
const stats = metricsCollector.getLatencyStats('chat/llm/stream');
// { p50: 200, p95: 800, p99: 1500, average: 300, count: 500 }
```

### 2. Erreurs

**Méthode :** `getErrorRateStats()`

**Retourne :**
- `rate` : Taux d'erreur global (0-1)
- `total` : Nombre total d'erreurs
- `byType` : Erreurs groupées par type

**Exemple :**
```typescript
const stats = metricsCollector.getErrorRateStats();
// { rate: 0.02, total: 20, byType: { validation_error: { count: 10, rate: 0.5 } } }
```

### 3. Throughput

**Méthode :** `getThroughputStats(window: '1m' | '5m' | '15m')`

**Retourne :**
- `messages` : Nombre de messages (endpoints chat)
- `requests` : Nombre de requêtes (endpoints API)

**Exemple :**
```typescript
const stats = metricsCollector.getThroughputStats('1m');
// { messages: 50, requests: 100 }
```

### 4. Cache Hit Rate

**Méthode :** `getCacheHitRate(cacheType: 'llm' | 'note_embed')`

**Retourne :**
- `hitRate` : Taux de hit (0-1)
- `hits` : Nombre de hits
- `misses` : Nombre de misses

**Exemple :**
```typescript
const stats = metricsCollector.getCacheHitRate('llm');
// { hitRate: 0.85, hits: 850, misses: 150 }
```

### 5. DB Latency

**Méthode :** `getDbLatencyStats(table?: string)`

**Retourne :**
- `p50`, `p95`, `p99` : Percentiles de latence DB
- `average` : Moyenne
- `count` : Nombre de queries

**Exemple :**
```typescript
const stats = metricsCollector.getDbLatencyStats('articles');
// { p50: 60, p95: 250, p99: 600, average: 120, count: 1000 }
```

### 6. Rate Limits

**Méthode :** `getRateLimitStats(endpoint?: string)`

**Retourne :**
- `hits` : Nombre de hits (rate limit dépassé)
- `total` : Nombre total de vérifications
- `rate` : Taux de hits (0-1)

**Exemple :**
```typescript
const stats = metricsCollector.getRateLimitStats('api');
// { hits: 5, total: 1000, rate: 0.005 }
```

---

## ⚙️ Configuration

### Variables d'Environnement

```bash
# Slack Webhook (optionnel)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email Alert (optionnel, TODO: implémentation complète)
ALERT_EMAIL_TO=alerts@example.com
```

### Paramètres Internes

**MetricsCollector :**
- `MAX_METRICS` : 10000 (taille max du buffer par type de métrique)
- `WINDOW_MS` : 24 * 60 * 60 * 1000 (24 heures de rétention)
- `CLEANUP_INTERVAL_MS` : 5 * 60 * 1000 (nettoyage toutes les 5 minutes)

**AlertManager :**
- `CHECK_INTERVAL_MS` : 30 * 1000 (vérification toutes les 30 secondes)
- `ANTI_SPAM_MS` : 5 * 60 * 1000 (anti-spam 5 minutes)
- `MAX_ALERTS` : 100 (nombre max d'alertes stockées)

---

## 🧪 Tests

### Exécuter les Tests

```bash
# Tous les tests de monitoring
npm test -- src/services/monitoring/__tests__ src/app/api/metrics/__tests__

# Tests spécifiques
npm test -- src/services/monitoring/__tests__/MetricsCollector.test.ts
npm test -- src/services/monitoring/__tests__/AlertManager.test.ts
npm test -- src/app/api/metrics/__tests__/route.test.ts
```

### Coverage

```bash
npm test -- src/services/monitoring/__tests__ src/app/api/metrics/__tests__ --coverage
```

**Résultats actuels :**
- MetricsCollector : 85.81% lines
- AlertManager : 92.07% lines
- route.ts : 100% coverage

---

## 📊 Dashboard & Visualisation

### Intégration avec Outils Externes

L'endpoint `/api/metrics` peut être intégré avec :

- **Grafana** : Créer un datasource JSON et visualiser les métriques
- **Datadog** : Utiliser l'API pour envoyer les métriques
- **Prometheus** : Exporter les métriques au format Prometheus (TODO)
- **Custom Dashboard** : Créer un dashboard React interne

### Exemple d'Intégration Grafana

```json
{
  "datasource": {
    "type": "json",
    "url": "https://www.scrivia.app/api/metrics"
  },
  "panels": [
    {
      "title": "Latency P95",
      "targets": [{
        "expr": "$.latency.global.p95"
      }]
    },
    {
      "title": "Error Rate",
      "targets": [{
        "expr": "$.errors.global.rate * 100"
      }]
    }
  ]
}
```

---

## 🔒 Sécurité

### Accès à l'Endpoint `/api/metrics`

**Recommandation :** Protéger l'endpoint avec authentification en production.

```typescript
// src/app/api/metrics/route.ts
export async function GET(request: NextRequest) {
  // Vérifier authentification admin
  const session = await getServerSession();
  if (!session || !isAdmin(session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... rest of the code ...
}
```

### Variables d'Environnement

- Ne jamais commiter `SLACK_WEBHOOK_URL` ou `ALERT_EMAIL_TO`
- Utiliser des secrets management (Vercel Secrets, AWS Secrets Manager, etc.)

---

## 🚀 Performance

### Impact sur les Performances

- **Collecte** : Overhead minimal (~0.1ms par métrique)
- **Stockage** : En mémoire uniquement (pas de DB)
- **Nettoyage** : Automatique toutes les 5 minutes
- **Limite** : 10K entrées par type de métrique (FIFO)

### Optimisations

- Les métriques sont stockées en mémoire (rapide)
- Le nettoyage est asynchrone (non-bloquant)
- Les calculs de percentiles sont optimisés (tri uniquement si nécessaire)

---

## 🐛 Troubleshooting

### Les Métriques ne s'affichent pas

1. Vérifier que `metricsCollector.recordLatency()` est appelé
2. Vérifier que l'endpoint `/api/metrics` est accessible
3. Vérifier les logs : `logger.debug(LogCategory.MONITORING, ...)`

### Les Alertes ne sont pas envoyées

1. Vérifier `SLACK_WEBHOOK_URL` est configuré
2. Vérifier que `AlertManager` est initialisé (singleton)
3. Vérifier l'anti-spam (attendre 5 minutes entre alertes du même type)

### Performance dégradée

1. Vérifier la taille des buffers (max 10K par type)
2. Vérifier le nettoyage automatique (toutes les 5 minutes)
3. Vérifier les logs pour des erreurs dans `MetricsCollector`

---

## 📝 Changelog

### Version 1.0 (5 janvier 2026)

- ✅ Création `MetricsCollector` (collecte centralisée)
- ✅ Création `AlertManager` (alertes automatiques)
- ✅ Endpoint `/api/metrics` (exposition JSON)
- ✅ Wrapper `supabaseWithMetrics` (tracking DB automatique)
- ✅ Intégration routes chat, note, cache, middleware
- ✅ Tests unitaires complets (89 tests, >85% coverage)
- ✅ Documentation complète

---

## 🔮 Roadmap

### Améliorations Futures

- [ ] Export Prometheus format
- [ ] Dashboard React interne
- [ ] Alertes Email complètes (Nodemailer/SendGrid)
- [ ] Persistance métriques (Redis/PostgreSQL)
- [ ] Métriques custom par feature
- [ ] Intégration Sentry pour corrélation erreurs

---

## 📚 Références

- **GUIDE-EXCELLENCE-CODE.md** : Standards de code
- **PLAN-PHASE-1.4-MONITORING.md** : Plan d'implémentation
- **Tests** : `src/services/monitoring/__tests__/`

---

**Maintenu par :** Jean-Claude (Senior Dev)  
**Contact :** Via issues GitHub  
**License :** Propriétaire (Scrivia)


