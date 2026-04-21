# Production readiness — TypeScript & ESLint

**Date du rapport :** 19 avril 2026  
**Dernière mise à jour (travaux P0 / P1) :** 19 avril 2026  
**Objectif :** Document de référence pour la roadmap de corrections (qualité TypeScript, lint, passage production).  
**Comment ce document a été produit :** synthèse d’audits exécutés sur le dépôt à cette date (`eslint src`, `tsc --noEmit -p tsconfig.build.json`, `tsc --noEmit`, `tsc` dans `proxy/`).

---

## Statut P0 et P1 (19 avril 2026)

| Lot | État | Détail |
|-----|------|--------|
| **P0 TypeScript** | **Fait** | Mocks editor : `exportModalOpen`, `setExportModalOpen`, fixture [`src/hooks/editor/__tests__/fixtures.ts`](src/hooks/editor/__tests__/fixtures.ts). `npm run typecheck:full` : **0 erreur**. |
| **P0 ESLint erreurs** | **Fait** | `shared/page.tsx` : guillemets via entités HTML (`&laquo;` / `&raquo;`) pour supprimer les espaces irréguliers. `groqResponses.ts` : bloc `eslint-disable require-yield` documenté pour le stub `callWithMessagesStream`. **`npm run lint` : 0 erreur.** |
| **P1 Variables / imports non utilisés** | **Partiel** | Ajout de **`eslint-plugin-unused-imports`**, désactivation du doublon `@typescript-eslint/no-unused-vars`, règles `unused-imports/no-unused-imports` + `unused-imports/no-unused-vars` avec préfixe `_` ignoré. `npm run lint:fix` supprime les imports morts automatiquement. Stubs préfixés dans [`v2DatabaseUtils.refactored.ts`](src/utils/v2DatabaseUtils.refactored.ts), correctifs ciblés (`youtube`, `errorHandler`, `useCanvaStore`, utils). **Il reste ≈ 337 avertissements `unused-imports/no-unused-vars`** à traiter manuellement (alias `prop: _prop` dans les props, suppression de code mort, etc.) — ne pas utiliser de renommage automatique aveugle sur tout `src/` (risque de casser le typage des props). |

---

## Synthèse globale (après travaux — à regénérer après la prochaine passe)

| Vérification | Commande | Résultat | Problèmes |
|--------------|----------|----------|-----------|
| **TypeScript (CI / build)** | `npm run typecheck` → `tsc -p tsconfig.build.json` | OK | **0** |
| **TypeScript (projet élargi)** | `npm run typecheck:full` → `tsc --noEmit` | OK | **0** |
| **TypeScript (proxy)** | `npx tsc --noEmit` dans `proxy/` | OK | **0** |
| **ESLint** | `npm run lint` (`eslint src`) | OK (warnings uniquement) | **0 erreur**, **≈ 633 avertissements** |

### Note importante — `tsconfig.build.json` vs racine

`tsconfig.build.json` **exclut** notamment `src/**/__tests__/**/*`. Les erreurs TypeScript dans les tests n’apparaissent donc pas dans `npm run typecheck`, mais apparaissent dans `npm run typecheck:full`. Si la CI ne lance que `typecheck`, les tests peuvent être **cassés au typage** sans être détectés.

---

## TypeScript — détail

| Jeu de fichiers | Fichiers concernés | Erreurs | Commentaire |
|-----------------|-------------------|---------|-------------|
| `tsconfig.build.json` | `src/**/*.ts(x)` hors exclusions (tests, certains scripts, etc.) | **0** | Aligné avec un build « app » sans tests unitaires dans le graphe principal |
| `tsconfig.json` (racine) | Périmètre plus large, incluant les tests sous `src` | **2** | Même problème signalé sur 2 fichiers de test |

### Erreurs `typecheck:full` (historique audit initial — corrigées)

Les mocks dans `useEditorEffects` / `useEditorHandlers` / mock `useMenusState` dans `useEditorState.test` incluent désormais **`exportModalOpen`** et les setters attendus ; voir fixture partagée `DEFAULT_MENUS_STATE`.

---

## ESLint — totaux (après travaux)

| Métrique | Valeur indicative |
|----------|-------------------|
| **Erreurs** (severity 2) | **0** |
| **Avertissements** | **≈ 633** |
| Principale règle restante | **`unused-imports/no-unused-vars`** (≈ 337) |

---

## ESLint — avertissements par règle (après travaux — agrégat)

| # | Règle | Occurrences approx. |
|---|-------|---------------------|
| 1 | `unused-imports/no-unused-vars` | **337** |
| 2 | `react-hooks/exhaustive-deps` | **101** |
| 3 | `react/no-unescaped-entities` | **99** |
| 4 | `@typescript-eslint/no-explicit-any` | **47** |
| 5 | `@next/next/no-img-element` | **39** |
| 6 | `@typescript-eslint/no-require-imports` | **8** |
| 7 | `@next/next/no-html-link-for-pages` | **2** |

Les imports non utilisés sont en partie corrigés par **`npm run lint:fix`** (`unused-imports/no-unused-imports`). La suite P1 pour **`no-unused-vars`** reste manuelle ou par petits lots (fichier par fichier).

---

## ESLint — répartition historique par racine (audit initial)

Les ordres de grandeur ci-dessous provenaient du premier audit ; après correctifs, utiliser `eslint src --format json` pour un nouveau découpage si besoin.

| Zone `src/…` | Nombre de warnings (réf. initial) |
|--------------|-------------------------------------|
| `components/` | 298 |
| `app/` | 206 |
| `services/` | 191 |
| `hooks/` | 153 |
| `utils/` | 103 |
| Autres | ≈ 41 |

---

## Roadmap de correction recommandée (priorité décroissante)

| Priorité | Cible | Pourquoi |
|----------|-------|----------|
| **P0** | Corriger les **2 erreurs TypeScript** dans les tests editor (`MenusState` / `exportModalOpen`) | `typecheck:full` vert ; cohérence avec l’état réel du code |
| **P0** | Corriger les **3 erreurs ESLint** (`shared/page.tsx`, `groqResponses.ts`) | `npm run lint` et chaînes type `npm run audit` redeviennent verts |
| **P1** | **`unused-imports/no-unused-vars`** (≈ 337 restants) par lots : `components` → `app` → `services` → `hooks` → `utils` | Imports auto-fixables déjà passés ; préfixer `_` ou alias `name: _name`, pas renommage massif automatique |
| **P2** | **`react-hooks/exhaustive-deps` (101)** | Risque fonctionnel (closures obsolètes, effets incomplets) — revue au cas par cas |
| **P3** | **`react/no-unescaped-entities` (99)** | Qualité JSX / lisibilité ; correctifs souvent triviaux |
| **P4** | **`no-explicit-any` (47)** et **`prefer-const` (16)** | Typage et style après les lots P1–P3 |
| **P5** | **`no-img-element` (39)** et **`no-html-link-for-pages` (2)** | Bonnes pratiques Next ; parfois volontaire — à valider |
| **P6** | **`no-require-imports` (8)** | Migration vers `import` ESM |

### Décision produit / CI à trancher

Choisir la référence officielle : **`typecheck` seul** ou **`typecheck` + `typecheck:full`**, et aligner la CI pour éviter les surprises sur les tests.

---

## Commandes utiles

| Action | Commande |
|--------|----------|
| Lint | `npm run lint` |
| Lint avec correctifs automatiques (où applicable) | `npm run lint:fix` |
| TS build (sans tests exclus du build config) | `npm run typecheck` |
| TS tout périmètre racine | `npm run typecheck:full` |
| Lint + TS build | `npm run audit` |

---

## Historique du document

| Version | Date | Changement |
|---------|------|------------|
| 1.0 | 2026-04-19 | Création à partir de l’audit TypeScript / ESLint du dépôt |
| 1.1 | 2026-04-19 | Statut P0/P1, synthèse post-correction, plugin `eslint-plugin-unused-imports`, rappel sur les correctifs manuels restants |
