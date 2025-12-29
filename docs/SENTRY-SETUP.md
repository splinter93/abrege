# 🔍 Configuration Sentry

Sentry est maintenant intégré pour le monitoring des erreurs en production.

## 📋 Configuration

### 1. Variables d'environnement

Ajouter dans `.env.local` (ou variables d'environnement Vercel) :

```bash
# Sentry DSN (obtenu depuis https://sentry.io)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx  # Optionnel, utilise NEXT_PUBLIC_SENTRY_DSN si absent
```

### 2. Créer un projet Sentry

1. Aller sur https://sentry.io
2. Créer un nouveau projet "Next.js"
3. Copier le DSN dans les variables d'environnement

### 3. Intégration automatique

Sentry est déjà intégré dans :
- ✅ `src/utils/logger.ts` → `sendToMonitoring()` envoie automatiquement les erreurs
- ✅ `sentry.client.config.ts` → Configuration côté client
- ✅ `sentry.server.config.ts` → Configuration côté serveur
- ✅ `instrumentation.ts` → Initialisation côté serveur (Next.js)
- ✅ `next.config.ts` → Instrumentation activée

## 🚀 Utilisation

Les erreurs sont automatiquement envoyées à Sentry quand :
- `logger.error()` est appelé en production
- Une exception non gérée se produit
- `ErrorBoundary` capture une erreur React

## 📊 Performance Monitoring

Le taux d'échantillonnage est configuré à :
- **Production** : 10% des transactions
- **Développement** : 100% des transactions

## 🔧 Désactiver Sentry

Pour désactiver Sentry temporairement :
1. Retirer `NEXT_PUBLIC_SENTRY_DSN` des variables d'environnement
2. Ou commenter l'import dans `src/utils/logger.ts`

## 📝 Notes

- Sentry ne s'active **que en production** (pas en dev)
- Les erreurs de validation et d'authentification sont ignorées
- Les erreurs réseau communes sont filtrées



