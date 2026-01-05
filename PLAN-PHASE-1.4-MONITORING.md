# 📊 Plan Phase 1.4 : Monitoring & Métriques Custom
**Date :** 5 janvier 2026  
**Objectif :** Implémenter système de monitoring complet pour 500 users  
**Conforme :** GUIDE-EXCELLENCE-CODE.md

---

## 🎯 OBJECTIFS

### Métriques Clés à Implémenter
1. **Latence P50/P95/P99** (message → réponse)
2. **Throughput** (messages/min, requests/min)
3. **Taux d'erreur** (par type : auth, validation, LLM, DB)
4. **Rate limit hits** (par endpoint, par user)
5. **Cache hit rate** (LLM cache, Note Embed cache)
6. **DB query latency** (P50/P95/P99 par table)

### Alertes Automatiques
- Taux d'erreur > 5% → Slack/Email
- Latence P95 > 10s → Slack/Email
- Rate limit > 10% requests → Slack/Email
- DB queries > 1s → Slack/Email

---

## 📋 ARCHITECTURE

### Services à Créer

#### 1. `MetricsCollector.ts`
**Rôle :** Service centralisé de collecte de métriques

**Responsabilités :**
- Collecter latences (P50/P95/P99) par endpoint
- Calculer throughput (fenêtre glissante 1min, 5min, 15min)
- Tracer taux d'erreur par type
- Tracer DB query latencies
- Tracer cache hit rates
- Stocker métriques en mémoire (avec limite 10K entrées)

**Interface :**
```typescript
interface MetricsCollector {
  recordLatency(endpoint: string, latency: number, success: boolean): void;
  recordError(endpoint: string, errorType: string, error: Error): void;
  recordDbQuery(table: string, latency: number): void;
  recordCacheHit(cacheType: 'llm' | 'note_embed', hit: boolean): void;
  recordRateLimit(endpoint: string, userId: string, hit: boolean): void;
  
  getLatencyStats(endpoint?: string): LatencyStats;
  getThroughputStats(window?: '1m' | '5m' | '15m'): ThroughputStats;
  getErrorRateStats(errorType?: string): ErrorRateStats;
  getDbLatencyStats(table?: string): DbLatencyStats;
  getCacheHitRate(cacheType?: 'llm' | 'note_embed'): number;
  getRateLimitStats(endpoint?: string): RateLimitStats;
}
```

**Stockage :**
- In-memory avec fenêtre glissante (24h max)
- Nettoyage automatique des entrées > 24h
- Limite 10K entrées par type de métrique

---

#### 2. `AlertManager.ts`
**Rôle :** Gestionnaire d'alertes automatiques

**Responsabilités :**
- Vérifier seuils toutes les 30s
- Envoyer alertes Slack/Email si dépassement
- Éviter spam (max 1 alerte/5min par type)
- Logger toutes les alertes

**Interface :**
```typescript
interface AlertManager {
  checkThresholds(): Promise<void>;
  sendAlert(type: AlertType, severity: 'warning' | 'critical', data: AlertData): Promise<void>;
  getRecentAlerts(limit?: number): Alert[];
}

interface Alert {
  type: AlertType;
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  sent: boolean;
}

type AlertType = 
  | 'error_rate_high'
  | 'latency_p95_high'
  | 'rate_limit_high'
  | 'db_query_slow'
  | 'cache_hit_rate_low';
```

**Seuils :**
- `error_rate_high`: > 5% (warning), > 10% (critical)
- `latency_p95_high`: > 10s (warning), > 20s (critical)
- `rate_limit_high`: > 10% requests (warning), > 20% (critical)
- `db_query_slow`: > 1s (warning), > 3s (critical)
- `cache_hit_rate_low`: < 50% (warning), < 30% (critical)

**Intégrations :**
- Slack: Webhook URL (env: `SLACK_WEBHOOK_URL`)
- Email: SMTP (env: `ALERT_EMAIL_TO`, `SMTP_*`)
- Fallback: Logger si pas configuré

---

#### 3. Endpoint `/api/metrics`
**Rôle :** Exposer toutes les métriques via API

**Route :** `GET /api/metrics`

**Réponse :**
```typescript
{
  success: true,
  timestamp: string,
  latency: {
    global: { p50: number, p95: number, p99: number },
    byEndpoint: Record<string, { p50: number, p95: number, p99: number }>
  },
  throughput: {
    '1m': { messages: number, requests: number },
    '5m': { messages: number, requests: number },
    '15m': { messages: number, requests: number }
  },
  errors: {
    global: { rate: number, total: number },
    byType: Record<string, { rate: number, total: number }>
  },
  rateLimits: {
    global: { hits: number, total: number, rate: number },
    byEndpoint: Record<string, { hits: number, total: number, rate: number }>
  },
  cache: {
    llm: { hitRate: number, hits: number, misses: number },
    note_embed: { hitRate: number, hits: number, misses: number }
  },
  database: {
    global: { p50: number, p95: number, p99: number },
    byTable: Record<string, { p50: number, p95: number, p99: number }>
  },
  alerts: {
    recent: Alert[],
    active: Alert[]
  }
}
```

**Auth :** Optionnel (peut être public pour monitoring interne)

---

## 🔧 IMPLÉMENTATION

### Étape 1 : Créer MetricsCollector.ts
**Fichier :** `src/services/monitoring/MetricsCollector.ts`

**Fonctionnalités :**
1. Classe singleton `MetricsCollector`
2. Stockage in-memory avec Map
3. Calcul P50/P95/P99 (tri + percentile)
4. Fenêtre glissante pour throughput (1min, 5min, 15min)
5. Nettoyage automatique (interval 5min)
6. Limite 10K entrées par type

**Dépendances :**
- `@/utils/logger` (LogCategory.MONITORING)

---

### Étape 2 : Créer AlertManager.ts
**Fichier :** `src/services/monitoring/AlertManager.ts`

**Fonctionnalités :**
1. Classe singleton `AlertManager`
2. Vérification seuils toutes les 30s (setInterval)
3. Envoi Slack (webhook)
4. Envoi Email (SMTP via nodemailer ou service externe)
5. Anti-spam (Map<AlertType, timestamp>)
6. Stockage alertes récentes (100 max)

**Dépendances :**
- `@/utils/logger` (LogCategory.MONITORING)
- `@/services/monitoring/MetricsCollector` (pour récupérer métriques)

**Env Variables :**
- `SLACK_WEBHOOK_URL` (optionnel)
- `ALERT_EMAIL_TO` (optionnel)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optionnel)

---

### Étape 3 : Créer Endpoint `/api/metrics`
**Fichier :** `src/app/api/metrics/route.ts`

**Fonctionnalités :**
1. GET handler
2. Récupérer toutes les métriques via `MetricsCollector`
3. Récupérer alertes via `AlertManager`
4. Formater réponse JSON
5. Gestion erreurs

**Dépendances :**
- `@/services/monitoring/MetricsCollector`
- `@/services/monitoring/AlertManager`
- `@/utils/logger` (LogCategory.API)

---

### Étape 4 : Intégrer Tracking Latence dans Routes Critiques

#### 4.1 `/api/chat/llm/stream`
**Fichier :** `src/app/api/chat/llm/stream/route.ts`

**Modifications :**
```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let success = false;
  
  try {
    // ... existing code ...
    success = true;
  } catch (error) {
    // ... existing error handling ...
    metricsCollector.recordError('chat/llm/stream', 'llm_error', error as Error);
  } finally {
    const latency = Date.now() - startTime;
    metricsCollector.recordLatency('chat/llm/stream', latency, success);
  }
}
```

#### 4.2 `/api/chat/llm`
**Fichier :** `src/app/api/chat/llm/route.ts`

**Modifications :** Même pattern que 4.1

#### 4.3 `/api/v2/note/[ref]`
**Fichier :** `src/app/api/v2/note/[ref]/route.ts`

**Modifications :** Même pattern + tracking DB queries

---

### Étape 5 : Wrapper Supabase pour DB Latency

**Fichier :** `src/utils/supabaseWithMetrics.ts`

**Fonctionnalités :**
1. Wrapper autour de `createClient` Supabase
2. Intercepter toutes les queries (select, insert, update, delete)
3. Mesurer latence avec `Date.now()`
4. Enregistrer via `MetricsCollector.recordDbQuery(table, latency)`
5. Retourner résultat original

**Interface :**
```typescript
export function createSupabaseClientWithMetrics(
  url: string,
  key: string
): SupabaseClient {
  const client = createClient(url, key);
  
  // Wrapper pour intercepter queries
  return wrapSupabaseClient(client);
}
```

**Usage :**
- Remplacer `createClient` par `createSupabaseClientWithMetrics` dans les routes critiques
- Ou créer middleware global (plus complexe)

**Alternative :**
- Utiliser Supabase Postgres extensions (pg_stat_statements) si disponible
- Ou wrapper au niveau service (plus simple)

---

### Étape 6 : Intégrer Tracking Cache Hit Rate

#### 6.1 LLMCacheService
**Fichier :** `src/services/cache/LLMCacheService.ts`

**Modifications :**
```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

async get(request: LLMRequest): Promise<LLMResponse | null> {
  const cached = await this.cache.get<LLMResponse>(key);
  metricsCollector.recordCacheHit('llm', !!cached);
  return cached;
}
```

#### 6.2 NoteEmbedCacheService
**Fichier :** `src/services/cache/NoteEmbedCacheService.ts`

**Modifications :** Même pattern que 6.1

---

### Étape 7 : Intégrer Tracking Rate Limit Hits

**Fichier :** `src/middleware.ts` et routes API

**Modifications :**
```typescript
import { metricsCollector } from '@/services/monitoring/MetricsCollector';

// Dans middleware.ts
const result = ipApiRateLimiter.checkSync(clientIP);
if (!result.allowed) {
  metricsCollector.recordRateLimit('api', clientIP, true);
  // ... return 429 ...
} else {
  metricsCollector.recordRateLimit('api', clientIP, false);
}
```

---

## ✅ VÉRIFICATIONS

### Tests Unitaires
- [ ] `MetricsCollector.test.ts` : Test calcul P50/P95/P99, throughput, nettoyage
- [ ] `AlertManager.test.ts` : Test seuils, anti-spam, envoi alertes
- [ ] `api/metrics/route.test.ts` : Test endpoint GET

### Tests Manuels
- [ ] Vérifier `/api/metrics` retourne toutes les métriques
- [ ] Vérifier alertes envoyées si seuils dépassés
- [ ] Vérifier latences enregistrées dans routes critiques
- [ ] Vérifier DB latencies enregistrées
- [ ] Vérifier cache hit rates enregistrés

### Build
- [ ] `npm run build` sans erreurs TypeScript
- [ ] `read_lints` sur tous fichiers modifiés

---

## 📊 MÉTRIQUES DE SUCCÈS

### Performance
- Latence P95 < 2s (message → réponse)
- Throughput > 100 messages/min
- DB query latency P95 < 100ms

### Monitoring
- Métriques disponibles via `/api/metrics`
- Alertes configurées et fonctionnelles
- Dashboard opérationnel (optionnel)

---

## 🚨 RISQUES & MITIGATIONS

### Risque 1 : Performance Impact
**Mitigation :**
- Collecte asynchrone (non-bloquant)
- Limite 10K entrées par type
- Nettoyage automatique

### Risque 2 : Memory Leak
**Mitigation :**
- Fenêtre glissante (24h max)
- Nettoyage interval 5min
- Limite stricte 10K entrées

### Risque 3 : Alertes Spam
**Mitigation :**
- Anti-spam (1 alerte/5min par type)
- Seuils conservateurs
- Logging toutes alertes

---

## 📝 NOTES

- **Conformité GUIDE :** Zero `any`, zero `@ts-ignore`, logger structuré
- **Performance :** Collecte non-bloquante, limites strictes
- **Maintenabilité :** Code < 300 lignes par fichier, interfaces explicites
- **Tests :** Coverage > 60% pour nouveaux services

---

**Prêt pour implémentation** ✅

