# 🎯 PLAN REFACTORING V2DATABASEUTILS - MÉTICULEUX

**Date :** 2026-01-05  
**Standard :** GUIDE-EXCELLENCE-CODE.md (strict)  
**Fichier source :** `src/utils/v2DatabaseUtils.ts` (2372 lignes)  
**Objectif :** Refactoring complet conforme au guide

---

## 📊 ÉTAT ACTUEL

### Fichier source
- **Lignes :** 2372 (7.9x la limite de 300)
- **Méthodes statiques :** ~56 méthodes
- **Interfaces/types :** 9 interfaces exportées
- **Dépendances :** 23+ fichiers importent ce module

### Refactoring existant (partiel)
- ✅ `src/utils/database/queries/noteQueries.ts` (245 lignes) ✅
- ✅ `src/utils/database/mutations/noteMutations.ts` (303 lignes) ⚠️ (dépasse 300)
- ✅ `src/utils/database/queries/classeurQueries.ts` (173 lignes) ✅
- ✅ `src/utils/database/mutations/classeurMutations.ts` (258 lignes) ✅
- ✅ `src/utils/database/queries/dossierQueries.ts` (119 lignes) ✅
- ✅ `src/utils/database/mutations/dossierMutations.ts` (322 lignes) ⚠️ (dépasse 300)
- ✅ `src/utils/database/permissions/permissionQueries.ts` (78 lignes) ✅
- ✅ `src/utils/database/search/searchQueries.ts` (124 lignes) ✅

**Problèmes détectés :**
- ⚠️ `noteMutations.ts` : 303 lignes (dépasse limite)
- ⚠️ `dossierMutations.ts` : 322 lignes (dépasse limite)
- ❌ Beaucoup de méthodes encore dans `v2DatabaseUtils.ts` original

---

## 🎯 STRATÉGIE CONFORME GUIDE

### Principes stricts
1. **Max 300 lignes par fichier** (strict, pas de compromis)
2. **1 fichier = 1 responsabilité** (queries OU mutations, pas les deux)
3. **Tests avant refactoring** (vérifier comportement existant)
4. **Migration progressive** (wrapper de compatibilité)
5. **Documentation JSDoc complète** (toutes fonctions publiques)
6. **Vérification après chaque étape** (`read_lints` + build)

---

## 📋 PLAN DÉTAILLÉ ÉTAPE PAR ÉTAPE

### PHASE 1 : ANALYSE COMPLÈTE (AVANT TOUT)

#### Étape 1.1 : Inventaire complet des méthodes
- [ ] Lister toutes les 56 méthodes statiques
- [ ] Grouper par responsabilité (notes, classeurs, dossiers, agents, search, etc.)
- [ ] Identifier dépendances entre méthodes
- [ ] Documenter chaque méthode (signature, responsabilité)

#### Étape 1.2 : Vérifier état actuel refactoring
- [ ] Comparer méthodes dans `v2DatabaseUtils.ts` vs modules refactorés
- [ ] Identifier méthodes manquantes dans modules refactorés
- [ ] Vérifier conformité fichiers existants (< 300 lignes)

#### Étape 1.3 : Analyser dépendances
- [ ] Lister tous les fichiers qui importent `v2DatabaseUtils`
- [ ] Identifier usages critiques (routes API)
- [ ] Planifier migration progressive

---

### PHASE 2 : CORRECTION FICHIERS EXISTANTS (> 300 LIGNES)

#### Étape 2.1 : Corriger `noteMutations.ts` (303 → < 300)
**Fichier :** `src/utils/database/mutations/noteMutations.ts`

**Actions :**
- [ ] Analyser structure actuelle
- [ ] Extraire helpers dans `noteMutationsHelpers.ts` si nécessaire
- [ ] Vérifier que chaque fonction < 50 lignes (guide)
- [ ] Vérifier avec `read_lints`

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ 0 erreur TypeScript
- ✅ Build passe

#### Étape 2.2 : Corriger `dossierMutations.ts` (322 → < 300)
**Fichier :** `src/utils/database/mutations/dossierMutations.ts`

**Actions :**
- [ ] Analyser structure actuelle
- [ ] Extraire helpers dans `dossierMutationsHelpers.ts` si nécessaire
- [ ] Vérifier que chaque fonction < 50 lignes
- [ ] Vérifier avec `read_lints`

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ 0 erreur TypeScript
- ✅ Build passe

---

### PHASE 3 : EXTRACTION TYPES

#### Étape 3.1 : Créer `databaseTypes.ts`
**Fichier :** `src/utils/database/types/databaseTypes.ts`

**Contenu :**
- [ ] Extraire toutes les interfaces de `v2DatabaseUtils.ts`
- [ ] Organiser par domaine (notes, classeurs, dossiers, agents)
- [ ] Ajouter JSDoc pour chaque interface
- [ ] Vérifier < 300 lignes

**Interfaces à extraire :**
- `ApiContext`
- `CreateNoteData`
- `UpdateNoteData`
- `CreateFolderData`
- `UpdateFolderData`
- `CreateClasseurData`
- `UpdateClasseurData`
- `ShareSettings`
- `AgentData`
- `ContentOperation`

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ Tous types exportés
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

---

### PHASE 4 : COMPLÉTER REFACTORING QUERIES

#### Étape 4.1 : Compléter `noteQueries.ts`
**Fichier :** `src/utils/database/queries/noteQueries.ts` (245 lignes)

**Méthodes à vérifier/ajouter :**
- [ ] `getNoteContent` (ligne 425)
- [ ] `getTableOfContents` (ligne 1599)
- [ ] `getNoteStatistics` (ligne 1639)
- [ ] `getNoteShareSettings` (ligne 2034)
- [ ] `getRecentNotes` (ligne 2095)
- [ ] `getNoteTOC` (alias, ligne 2027)

**Critères de succès :**
- ✅ Toutes méthodes queries notes présentes
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 4.2 : Compléter `classeurQueries.ts`
**Fichier :** `src/utils/database/queries/classeurQueries.ts` (173 lignes)

**Méthodes à vérifier/ajouter :**
- [ ] `getClasseurTree` (ligne 1147)
- [ ] `getClasseurs` (ligne 1321)
- [ ] `getClasseur` (ligne 1822)
- [ ] `getClasseursWithContent` (ligne 2121)
- [ ] `listClasseurs` (ligne 2128)

**Critères de succès :**
- ✅ Toutes méthodes queries classeurs présentes
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 4.3 : Compléter `dossierQueries.ts`
**Fichier :** `src/utils/database/queries/dossierQueries.ts` (119 lignes)

**Méthodes à vérifier/ajouter :**
- [ ] `getFolderTree` (ligne 1727)
- [ ] `getFolder` (ligne 1847)

**Critères de succès :**
- ✅ Toutes méthodes queries dossiers présentes
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 4.4 : Compléter `searchQueries.ts`
**Fichier :** `src/utils/database/search/searchQueries.ts` (124 lignes)

**Méthodes à vérifier/ajouter :**
- [ ] `searchNotes` (ligne 1897)
- [ ] `searchClasseurs` (ligne 1923)
- [ ] `searchFiles` (ligne 1949)
- [ ] `searchContent` (ligne 2135)

**Critères de succès :**
- ✅ Toutes méthodes search présentes
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

---

### PHASE 5 : COMPLÉTER REFACTORING MUTATIONS

#### Étape 5.1 : Compléter `noteMutations.ts` (< 300 lignes)
**Fichier :** `src/utils/database/mutations/noteMutations.ts`

**Méthodes à vérifier/ajouter :**
- [ ] `updateNote` (ligne 203)
- [ ] `deleteNote` (ligne 348)
- [ ] `addContentToNote` (ligne 472)
- [ ] `moveNote` (ligne 538)
- [ ] `insertContentToNote` (ligne 1386)
- [ ] `addContentToSection` (ligne 1440)
- [ ] `clearSection` (ligne 1493)
- [ ] `eraseSection` (ligne 1546)
- [ ] `publishNote` (ligne 1689)
- [ ] `updateNoteShareSettings` (ligne 2066)
- [ ] `applyContentOperations` (ligne 2011)

**Critères de succès :**
- ✅ Toutes méthodes mutations notes présentes
- ✅ Fichier < 300 lignes (si nécessaire, extraire helpers)
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 5.2 : Compléter `classeurMutations.ts`
**Fichier :** `src/utils/database/mutations/classeurMutations.ts` (258 lignes)

**Méthodes à vérifier/ajouter :**
- [ ] `updateClasseur` (ligne 991)
- [ ] `deleteClasseur` (ligne 1089)
- [ ] `reorderClasseurs` (ligne 1261)

**Critères de succès :**
- ✅ Toutes méthodes mutations classeurs présentes
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 5.3 : Compléter `dossierMutations.ts` (< 300 lignes)
**Fichier :** `src/utils/database/mutations/dossierMutations.ts`

**Méthodes à vérifier/ajouter :**
- [ ] `updateFolder` (ligne 663)
- [ ] `moveFolder` (ligne 756)
- [ ] `deleteFolder` (ligne 897)

**Critères de succès :**
- ✅ Toutes méthodes mutations dossiers présentes
- ✅ Fichier < 300 lignes (si nécessaire, extraire helpers)
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

---

### PHASE 6 : CRÉER MODULES MANQUANTS

#### Étape 6.1 : Créer `agentQueries.ts`
**Fichier :** `src/utils/database/queries/agentQueries.ts`

**Méthodes à extraire :**
- [ ] `listAgents` (ligne 2297)
- [ ] `getAgent` (ligne 2313)

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 6.2 : Créer `agentMutations.ts`
**Fichier :** `src/utils/database/mutations/agentMutations.ts`

**Méthodes à extraire :**
- [ ] `createAgent` (ligne 2305)
- [ ] `updateAgent` (ligne 2329)
- [ ] `patchAgent` (ligne 2337)
- [ ] `deleteAgent` (ligne 2345)
- [ ] `executeAgent` (ligne 2321)

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 6.3 : Créer `userQueries.ts`
**Fichier :** `src/utils/database/queries/userQueries.ts`

**Méthodes à extraire :**
- [ ] `getUserInfo` (ligne 1976)
- [ ] `getUserProfile` (ligne 2208)
- [ ] `getStats` (ligne 2165)

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 6.4 : Créer `trashQueries.ts`
**Fichier :** `src/utils/database/queries/trashQueries.ts`

**Méthodes à extraire :**
- [ ] `getTrash` (ligne 2215)

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 6.5 : Créer `trashMutations.ts`
**Fichier :** `src/utils/database/mutations/trashMutations.ts`

**Méthodes à extraire :**
- [ ] `restoreFromTrash` (ligne 2240)
- [ ] `purgeTrash` (ligne 2255)
- [ ] `deleteResource` (ligne 2270)

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

#### Étape 6.6 : Créer `utilsQueries.ts`
**Fichier :** `src/utils/database/queries/utilsQueries.ts`

**Méthodes à extraire :**
- [ ] `generateSlug` (ligne 1793)
- [ ] `listTools` (ligne 2353)
- [ ] `debugInfo` (ligne 2361)

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ JSDoc complet
- ✅ 0 erreur TypeScript

---

### PHASE 7 : CRÉER WRAPPER DE COMPATIBILITÉ

#### Étape 7.1 : Créer nouveau `v2DatabaseUtils.ts` (wrapper)
**Fichier :** `src/utils/v2DatabaseUtils.ts` (remplacer l'ancien)

**Structure :**
```typescript
/**
 * V2DatabaseUtils - Wrapper de compatibilité
 * Délègue aux modules refactorés (< 300 lignes chacun)
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Wrapper léger (< 300 lignes)
 * - Compatibilité 100% avec API existante
 * - Toutes méthodes délèguent aux modules
 */

// Re-exporter types
export type { ... } from './database/types/databaseTypes';

// Importer modules refactorés
import * as noteQueries from './database/queries/noteQueries';
import * as noteMutations from './database/mutations/noteMutations';
// ... etc

export class V2DatabaseUtils {
  // Délégation simple pour chaque méthode
  static async createNote(...) {
    return noteMutations.createNote(...);
  }
  // ... etc
}
```

**Critères de succès :**
- ✅ Fichier < 300 lignes
- ✅ Toutes méthodes délèguent aux modules
- ✅ Compatibilité 100% avec ancien code
- ✅ 0 erreur TypeScript
- ✅ Build passe

---

### PHASE 8 : VÉRIFICATIONS FINALES

#### Étape 8.1 : Vérifier tous les fichiers
- [ ] `read_lints` sur tous fichiers créés/modifiés
- [ ] Vérifier chaque fichier < 300 lignes
- [ ] Vérifier JSDoc complet
- [ ] Vérifier 0 erreur TypeScript

#### Étape 8.2 : Tests
- [ ] Build passe (`npm run build`)
- [ ] Typecheck passe (`npm run typecheck`)
- [ ] Lint passe (`npm run lint`)
- [ ] Vérifier imports fonctionnent

#### Étape 8.3 : Migration progressive
- [ ] Vérifier que tous les fichiers qui importent `v2DatabaseUtils` fonctionnent
- [ ] Tester routes API critiques
- [ ] Vérifier pas de régression

---

## 📐 RÈGLES STRICTES À RESPECTER

### Conformité GUIDE-EXCELLENCE-CODE.md

1. **Max 300 lignes par fichier** (strict, pas d'exception)
2. **1 fichier = 1 responsabilité** (queries OU mutations, pas les deux)
3. **Fonctions < 50 lignes** (si plus, décomposer)
4. **JSDoc complet** (toutes fonctions publiques)
5. **Types explicites** (pas de `any`, pas de `@ts-ignore`)
6. **Logger structuré** (pas de `console.log`)
7. **Gestion erreurs** (try/catch avec fallback)
8. **Validation Zod** (inputs API/DB)

### Process après chaque étape

1. ✅ Implémenter
2. ✅ `read_lints` sur fichier modifié
3. ✅ Vérifier < 300 lignes
4. ✅ Vérifier JSDoc
5. ✅ Build local
6. ✅ Commit avec message conforme

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Phase 1** : Analyse complète (fondation)
2. **Phase 2** : Corriger fichiers existants > 300 lignes
3. **Phase 3** : Extraire types
4. **Phase 4** : Compléter queries
5. **Phase 5** : Compléter mutations
6. **Phase 6** : Créer modules manquants
7. **Phase 7** : Créer wrapper compatibilité
8. **Phase 8** : Vérifications finales

---

## ⚠️ RISQUES ET MITIGATION

### Risque 1 : Casser compatibilité API
**Mitigation :** Wrapper de compatibilité qui délègue 100%

### Risque 2 : Fichiers > 300 lignes après extraction
**Mitigation :** Extraire helpers dans fichiers séparés

### Risque 3 : Erreurs TypeScript après refactoring
**Mitigation :** `read_lints` après chaque étape

### Risque 4 : Régressions fonctionnelles
**Mitigation :** Tests avant/après, migration progressive

---

## 📊 MÉTRIQUES DE SUCCÈS

- ✅ 0 fichier > 300 lignes
- ✅ 0 erreur TypeScript
- ✅ Build passe
- ✅ Tous imports fonctionnent
- ✅ JSDoc complet
- ✅ Compatibilité 100% maintenue

---

**Prochaine étape :** Commencer Phase 1 - Analyse complète

