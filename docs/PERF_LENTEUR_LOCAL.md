# Lenteur en environnement local – causes et correctifs

## Contexte

L’application était très lente au chargement sur le serveur local (`npm run dev`). Ce document résume les causes identifiées et les correctifs appliqués.

---

## Causes principales

### 1. **Polices bloquantes dans le layout (impact majeur)**

- **Problème** : Le `layout.tsx` racine chargeait **plus de 12 feuilles CSS Google Fonts** via `<link rel="stylesheet">` et `<link rel="preload">` dans le `<head>`.
- Chaque feuille est une requête réseau **bloquante** avant le premier rendu. Cumulées, elles rallongent fortement le temps avant affichage (surtout en dev, sans cache agressif).
- Les polices réellement nécessaires au premier rendu (Figtree, Geist, Inter, Manrope, JetBrains Mono) sont déjà chargées via :
  - **next/font** (Geist, Geist Mono, Noto Sans) dans le layout ;
  - **globals.css** et **typography.css** (`@import` Google Fonts).

**Correctif** : Suppression de tous les `<link>` Google Fonts du layout. On conserve uniquement `preconnect` pour les domaines fonts. Le chargement des polices se fait via next/font + CSS existant.

**Note** : Les polices du sélecteur dans Paramètres (Lato, Open Sans, Roboto, EB Garamond, etc.) ne sont plus chargées au démarrage. Si l’utilisateur choisit une de ces polices, le navigateur utilisera le fallback jusqu’à un éventuel chargement à la demande (à implémenter si besoin).

---

### 2. **Volume de logs en développement**

- **Problème** : En dev, le niveau de log était **DEBUG** : des centaines d’appels à `logger.debug()`, `logger.info()`, `simpleLogger.dev()` s’exécutaient à chaque interaction, avec sérialisation d’objets et écriture console.
- **Problème** : `AuthProvider` utilisait plusieurs `console.log` à chaque vérification de session et à chaque changement d’état auth.

**Correctifs** :

- **Logger** : En dev, le niveau par défaut est passé à **WARN**. Les logs détaillés (DEBUG/INFO) ne s’affichent que si `NEXT_PUBLIC_DEBUG_LOGS=1` est défini (ex. dans `.env.local`).
- **AuthProvider** : Suppression de tous les `console.log`.

---

### 3. **Autres facteurs possibles (non modifiés)**

- **Next.js en mode dev** : Compilation à la demande, source maps, pas de minification → plus lent qu’un build de prod. Normal pour `next dev`.
- **Sentry** : `tracesSampleRate: 1.0` en dev peut ajouter un peu d’overhead ; les erreurs ne sont pas envoyées (`beforeSend` retourne `null` en dev).
- **Nombre de CSS** : Beaucoup de fichiers CSS importés au layout (variables, design-system, editor, chat, etc.) ; consolidation ou chargement différé par route serait une évolution ultérieure.

---

## Vérification

1. Redémarrer le serveur : `npm run dev`.
2. Ouvrir l’app en navigation privée (ou vider le cache) pour mesurer le premier chargement.
3. Si besoin de logs verbeux en dev : ajouter dans `.env.local` :
   ```bash
   NEXT_PUBLIC_DEBUG_LOGS=1
   ```

---

## Résumé des fichiers modifiés

| Fichier | Modification |
|--------|----------------|
| `src/app/layout.tsx` | Suppression des ~12 `<link>` Google Fonts (preload + stylesheet) ; conservation de preconnect. |
| `src/utils/logger.ts` | Niveau de log en dev : WARN par défaut ; DEBUG si `NEXT_PUBLIC_DEBUG_LOGS=1`. |
| `src/components/AuthProvider.tsx` | Suppression de tous les `console.log`. |

---

*Document rédigé suite à l’analyse de la lenteur au chargement local – février 2026.*
