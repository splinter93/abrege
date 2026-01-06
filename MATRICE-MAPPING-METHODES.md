# MATRICE DE MAPPING - MÉTHODES → MODULES

**Date :** 2026-01-05

---

## ÉTAT ACTUEL DES MODULES REFACTORÉS

### noteQueries.ts (245 lignes) ✅
**Méthodes présentes :**
- ✅ `getNote` (ligne 22)
- ✅ `getNoteContent` (ligne 58)
- ✅ `getTableOfContents` (ligne 105)
- ✅ `getNoteStatistics` (ligne 173)
- ✅ `getRecentNotes` (ligne 223)
- ✅ `getNoteTOC` (ligne 166)

**Méthodes manquantes :**
- ❌ `getNoteShareSettings` (ligne 2034 dans v2DatabaseUtils.ts)

### noteMutations.ts (303 lignes) ⚠️ DÉPASSE LIMITE
**Méthodes présentes :**
- ✅ `createNote` (ligne 26)
- ✅ `updateNote` (ligne 92)
- ✅ `deleteNote` (ligne 212)
- ✅ `moveNote` (ligne 247)

**Méthodes manquantes :**
- ❌ `addContentToNote` (ligne 472)
- ❌ `insertContentToNote` (ligne 1386)
- ❌ `addContentToSection` (ligne 1440)
- ❌ `clearSection` (ligne 1493)
- ❌ `eraseSection` (ligne 1546)
- ❌ `publishNote` (ligne 1689)
- ❌ `updateNoteShareSettings` (ligne 2066)
- ❌ `applyContentOperations` (ligne 2011)
- ❌ `insertNoteContent` (alias ligne 2000)

### classeurQueries.ts (173 lignes) ✅
**Méthodes présentes :** À vérifier
**Méthodes manquantes :** À vérifier

### classeurMutations.ts (258 lignes) ✅
**Méthodes présentes :** À vérifier
**Méthodes manquantes :** À vérifier

### dossierQueries.ts (119 lignes) ✅
**Méthodes présentes :** À vérifier
**Méthodes manquantes :** À vérifier

### dossierMutations.ts (322 lignes) ⚠️ DÉPASSE LIMITE
**Méthodes présentes :** À vérifier
**Méthodes manquantes :** À vérifier

### searchQueries.ts (124 lignes) ✅
**Méthodes présentes :** À vérifier
**Méthodes manquantes :** À vérifier

### permissionQueries.ts (78 lignes) ✅
**Méthodes présentes :** À vérifier

---

## MAPPING COMPLET PAR MODULE CIBLE

### src/utils/database/queries/noteQueries.ts
**Méthodes à ajouter :**
- `getNoteShareSettings` (ligne 2034)

### src/utils/database/mutations/noteMutations.ts
**Méthodes à ajouter :**
- `addContentToNote` (ligne 472)
- `insertContentToNote` (ligne 1386)
- `addContentToSection` (ligne 1440)
- `clearSection` (ligne 1493)
- `eraseSection` (ligne 1546)
- `publishNote` (ligne 1689)
- `updateNoteShareSettings` (ligne 2066)
- `applyContentOperations` (ligne 2011)
- `insertNoteContent` (alias ligne 2000)

**Action requise :** Extraire helpers si > 300 lignes après ajout

### src/utils/database/queries/classeurQueries.ts
**Méthodes à vérifier/ajouter :**
- `getClasseurTree` (ligne 1147)
- `getClasseurs` (ligne 1321)
- `getClasseur` (ligne 1822)
- `getClasseursWithContent` (ligne 2121)
- `listClasseurs` (ligne 2128)

### src/utils/database/mutations/classeurMutations.ts
**Méthodes à vérifier/ajouter :**
- `updateClasseur` (ligne 991)
- `deleteClasseur` (ligne 1089)
- `reorderClasseurs` (ligne 1261)

### src/utils/database/queries/dossierQueries.ts
**Méthodes à vérifier/ajouter :**
- `getFolderTree` (ligne 1727)
- `getFolder` (ligne 1847)

### src/utils/database/mutations/dossierMutations.ts
**Méthodes à vérifier/ajouter :**
- `updateFolder` (ligne 663)
- `moveFolder` (ligne 756)
- `deleteFolder` (ligne 897)

### src/utils/database/search/searchQueries.ts
**Méthodes à vérifier/ajouter :**
- `searchNotes` (ligne 1897)
- `searchClasseurs` (ligne 1923)
- `searchFiles` (ligne 1949)
- `searchContent` (ligne 2135)

### src/utils/database/queries/agentQueries.ts (À CRÉER)
**Méthodes à extraire :**
- `listAgents` (ligne 2297)
- `getAgent` (ligne 2313)

### src/utils/database/mutations/agentMutations.ts (À CRÉER)
**Méthodes à extraire :**
- `createAgent` (ligne 2305)
- `updateAgent` (ligne 2329)
- `patchAgent` (ligne 2337)
- `deleteAgent` (ligne 2345)
- `executeAgent` (ligne 2321)

### src/utils/database/queries/userQueries.ts (À CRÉER)
**Méthodes à extraire :**
- `getUserInfo` (ligne 1976)
- `getUserProfile` (ligne 2208)
- `getStats` (ligne 2165)

### src/utils/database/queries/trashQueries.ts (À CRÉER)
**Méthodes à extraire :**
- `getTrash` (ligne 2215)

### src/utils/database/mutations/trashMutations.ts (À CRÉER)
**Méthodes à extraire :**
- `restoreFromTrash` (ligne 2240)
- `purgeTrash` (ligne 2255)
- `deleteResource` (ligne 2270)

### src/utils/database/queries/utilsQueries.ts (À CRÉER)
**Méthodes à extraire :**
- `generateSlug` (ligne 1793)
- `listTools` (ligne 2353)
- `debugInfo` (ligne 2361)

---

## FICHIERS QUI IMPORTENT V2DATABASEUTILS

1. `src/utils/v2DatabaseUtils.refactored.ts`
2. `src/utils/database/queries/dossierQueries.ts`
3. `src/utils/database/search/searchQueries.ts`
4. `src/utils/database/mutations/dossierMutations.ts`
5. `src/utils/database/queries/classeurQueries.ts`
6. `src/utils/database/mutations/classeurMutations.ts`
7. `src/app/api/v2/delete/[resource]/[ref]/route.ts`
8. `src/app/api/v2/folder/create/route.ts`
9. `src/utils/database/queries/noteQueries.ts`
10. `src/utils/database/mutations/noteMutations.ts`
11. `src/utils/database/permissions/permissionQueries.ts`
12. `src/app/api/v2/note/[ref]/update/route.ts`
13. `src/app/api/v2/note/[ref]/move/route.ts`
14. `src/app/api/v2/folder/[ref]/update/route.ts`
15. `src/app/api/v2/classeur/reorder/route.ts`
16. `src/app/api/v2/folder/[ref]/move/route.ts`
17. `src/app/api/v2/classeur/[ref]/update/route.ts`

**Routes API critiques :**
- `/api/v2/note/[ref]/update`
- `/api/v2/note/[ref]/move`
- `/api/v2/folder/create`
- `/api/v2/folder/[ref]/update`
- `/api/v2/folder/[ref]/move`
- `/api/v2/classeur/reorder`
- `/api/v2/classeur/[ref]/update`
- `/api/v2/delete/[resource]/[ref]`

