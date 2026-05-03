# Roadmap to CLEAN LINT

Document de travail : ordre de priorité des correctifs lint/TypeScript, de **P0** (fondations) à **P5** (finition). Mise à jour des compteurs à chaque itération.

**Dernière mise à jour du document** : mai 2026.

**Dernière prise de mesure (référence)** : exécuter

```bash
npx tsc --noEmit
npm run lint
npx vitest run
```

(`npm run lint` = `eslint src server --ext .ts,.tsx`, voir [`package.json`](package.json).)

**Scope couvert** : `src/` et `server/` (code application). Ne pas lancer `eslint` sur la racine du repo sans exclure les artefacts, sinon les totaux incluent `.next/` et deviennent non représentatifs.

---

## Travail réalisé (historique)

| Lot | Contenu | Détail |
|-----|---------|--------|
| **P0** | Fondations ESLint | [`eslint.config.mjs`](eslint.config.mjs) : `ignores` pour `.next/`, `coverage/`, `build/`, `www/`, `android/`, `node_modules/`, `dist/`, `backup/` (+ exclusions fichiers existantes). Scripts `lint` / `lint:fix` incluent `server/`. |
| **P1** | `no-explicit-any` | **47 → 0** warnings sur `src` + `server` : typage (hooks, services, `.d.ts`), payloads typés, tests avec `vi.mocked` / types au lieu de `any`. |
| **Hygiène tests** | Alignement spec ↔ code | Tests sanitizer alignés sur la politique documentée dans [`markdownSanitizer.server.ts`](src/utils/markdownSanitizer.server.ts) (`&`, `<`, `>` uniquement ; pas d’échappement systématique des `"`). [`ChatWidgetRoot.tsx`](src/components/chat/ChatWidgetRoot.tsx) : garde si `matchMedia` absent (jsdom). |
| **CI / qualité** | Suite Vitest | **662 tests OK** (58 fichiers) en exécution complète `npx vitest run`. |

---

## Baseline (référence actuelle)

| Métrique | Valeur |
|----------|--------|
| Erreurs TypeScript (`tsc --noEmit`) | **0** |
| Erreurs ESLint (`npm run lint`) | **0** |
| Warnings ESLint (`src` + `server`) | **~587** |
| `@typescript-eslint/no-explicit-any` | **0** |
| Vitest (`npx vitest run`) | **662 passed** *(réf. mai 2026)* |

**Répartition indicative des warnings restants** (ordre de volume) :

| Règle | ~Count | Priorité doc |
|-------|--------|---------------|
| `unused-imports/no-unused-vars` | ~336 | P3 |
| `react-hooks/exhaustive-deps` | ~101 | P2 |
| `react/no-unescaped-entities` | ~100 | P4 |
| `@next/next/no-img-element` | ~39 | P5 |
| `@typescript-eslint/no-require-imports` | ~7 | P5 |
| `unused-imports/no-unused-imports` | ~2 | P3 |
| `@next/next/no-html-link-for-pages` | ~2 | P5 |

---

## P0 — Fondations et garde-fous

**Statut : fait** (voir tableau « Travail réalisé »).

**Objectif** : la base ne se dégrade pas ; les métriques reflètent le vrai code.

- **TypeScript** : conserver **0 erreur** sur `tsc --noEmit` ; toute PR qui introduit une erreur TS est prioritaire.
- **ESLint** : config avec `ignores` explicites pour artefacts et hors-code app.
- **Scripts** : `npm run lint` = périmètre `src` + `server`.

**Critère GO** : une commande unique, reproductible, sans parasitage `.next/` — **atteint**.

---

## P1 — Typage strict (`no-explicit-any`)

**Statut : fait** — **0** warning `no-explicit-any` sur `src` + `server`.

**Objectif initial** : traiter ~47 avertissements.

- Remplacer `any` par des types concrets, `unknown` + narrowing, ou types partagés (`types/`, DTOs).
- Éviter les contournements (`@ts-ignore`) sauf justification exceptionnelle documentée.

**Critère GO** : **0** warning — **atteint**.

---

## P2 — Hooks React (`exhaustive-deps`)

**Objectif** : traiter les **~101** warnings `react-hooks/exhaustive-deps`.

- Pour chaque hook : soit ajouter les dépendances manquantes, soit refactoriser pour stabiliser les références (`useCallback` / `useMemo`), soit documenter pourquoi une exclusion volontaire est sûre (commentaire minimal au point d’usage).

**Critère GO** : **0** warning `exhaustive-deps` non traité (objectif **0** warning ; exceptions rares et commentées).

---

## P3 — Variables et imports inutilisés

**Objectif** : traiter **~336** `unused-imports/no-unused-vars` et **~2** `unused-imports/no-unused-imports`.

- Supprimer les imports morts ; préfixer avec `_` les paramètres intentionnellement non utilisés (convention déjà dans la config ESLint).
- Éviter les renommages massifs sans lecture du fichier (risque de casser le comportement).

**Critère GO** : **0** warning dans cette famille sur `src` + `server`.

---

## P4 — JSX (`no-unescaped-entities`)

**Objectif** : traiter les **~100** warnings `react/no-unescaped-entities`.

- Échapper les apostrophes et guillemets dans le texte JSX (`&apos;`, `&quot;`, ou chaînes avec `{'}'}` selon le style du fichier).

**Critère GO** : **0** warning `no-unescaped-entities`.

---

## P5 — Bonnes pratiques Next.js et modules

**Objectif** : finition qualité produit et perf.

- **`@next/next/no-img-element` (~39)** : migrer vers `next/image` lorsque pertinent (URLs, loaders, dimensions).
- **`@next/next/no-html-link-for-pages` (~2)** : utiliser `next/link` pour la navigation interne.
- **`@typescript-eslint/no-require-imports` (~7)** : préférer `import` ESM aligné sur le reste du codebase.

**Critère GO** : **0** warning dans ces trois règles sur `src` + `server`.

---

## Définition de « CLEAN LINT » (cible finale)

1. `npx tsc --noEmit` → **0 erreur**.
2. `npm run lint` → **0 erreur**, **0 warning** sur `src` + `server`.
3. `npx vitest run` → tous les tests au vert *(déjà le cas ; à maintenir à chaque étape)*.

---

## Suivi (à cocher au fil de l’eau)

| Priorité | Thème | Statut | Notes |
|----------|--------|--------|-------|
| P0 | Fondations / scope ESLint | **Fait** | ignores artefacts ; lint inclut `server/` |
| P1 | `no-explicit-any` | **Fait** | 47 → 0 ; baseline ~587 warnings |
| Hygiène | Vitest + spec sanitizer + `matchMedia` | **Fait** | 662 tests ; alignement tests / [`markdownSanitizer.server.ts`](src/utils/markdownSanitizer.server.ts) |
| P2 | `react-hooks/exhaustive-deps` | À faire | ~101 warnings |
| P3 | unused imports / vars | À faire | ~336 + ~2 |
| P4 | `no-unescaped-entities` | À faire | ~100 |
| P5 | Next image / link / require | À faire | ~48 |

**Prochaine action recommandée** : **P2** (`exhaustive-deps`) — impact comportement React ; puis **P3** (volume, correction mécanique prudente).

---

*Ce document est le guide de priorisation des travaux lint ; il ne remplace pas les règles projet dans `eslint.config.mjs` ni le guide d’excellence code interne.*
