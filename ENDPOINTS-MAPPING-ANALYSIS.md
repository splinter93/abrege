# 📋 Analyse des Endpoints - Outils vs Mapping

## 🔍 Outils Définis dans ApiV2Tools.ts

### ✅ Notes (8 outils)
- `createNote` ✅
- `getNote` ✅
- `updateNote` ✅
- `moveNote` ✅
- `insertNoteContent` ✅
- `applyContentOperations` ❌ **MANQUANT**
- `getNoteTOC` ✅
- `getNoteShareSettings` ❌ **MANQUANT**
- `updateNoteShareSettings` ❌ **MANQUANT**
- `getRecentNotes` ✅

### ✅ Classeurs (5 outils)
- `createClasseur` ✅
- `getClasseur` ✅
- `updateClasseur` ❌ **MANQUANT**
- `listClasseurs` ✅
- `getClasseursWithContent` ❌ **MANQUANT**
- `getClasseurTree` ✅

### ✅ Dossiers (6 outils)
- `createFolder` ✅
- `getFolder` ✅
- `updateFolder` ❌ **MANQUANT**
- `moveFolder` ❌ **MANQUANT**
- `getFolderTree` ✅

### ✅ Recherche (2 outils)
- `searchContent` ✅
- `searchFiles` ✅

### ✅ Utilisateur (2 outils)
- `getUserProfile` ✅
- `getStats` ✅

### ✅ Gestion (4 outils)
- `getTrash` ❌ **MANQUANT**
- `restoreFromTrash` ❌ **MANQUANT**
- `purgeTrash` ❌ **MANQUANT**
- `deleteResource` ✅

### ✅ Agents (1 outil)
- `listAgents` ✅

---

## 🚨 Outils Manquants dans le Mapping

### ❌ **12 outils manquants** dans `openApiToolExecutor.ts` :

1. `applyContentOperations` - POST `/api/v2/note/{ref}/apply-content-operations`
2. `getNoteShareSettings` - GET `/api/v2/note/{ref}/share-settings`
3. `updateNoteShareSettings` - PUT `/api/v2/note/{ref}/share-settings`
4. `updateClasseur` - PATCH `/api/v2/classeur/{ref}/update`
5. `getClasseursWithContent` - GET `/api/v2/classeurs/with-content`
6. `updateFolder` - PATCH `/api/v2/folder/{ref}/update`
7. `moveFolder` - PUT `/api/v2/folder/{ref}/move`
8. `getTrash` - GET `/api/v2/trash`
9. `restoreFromTrash` - POST `/api/v2/trash/restore`
10. `purgeTrash` - DELETE `/api/v2/trash/purge`

---

## 🔧 Actions Requises

### 1. Ajouter les mappings manquants dans `openApiToolExecutor.ts`

```typescript
// Notes
'applyContentOperations': { method: 'POST', path: `/api/v2/note/${args.ref}/apply-content-operations` },
'getNoteShareSettings': { method: 'GET', path: `/api/v2/note/${args.ref}/share-settings` },
'updateNoteShareSettings': { method: 'PUT', path: `/api/v2/note/${args.ref}/share-settings` },

// Classeurs
'updateClasseur': { method: 'PATCH', path: `/api/v2/classeur/${args.ref}/update` },
'getClasseursWithContent': { method: 'GET', path: '/api/v2/classeurs/with-content' },

// Dossiers
'updateFolder': { method: 'PATCH', path: `/api/v2/folder/${args.ref}/update` },
'moveFolder': { method: 'PUT', path: `/api/v2/folder/${args.ref}/move` },

// Gestion
'getTrash': { method: 'GET', path: '/api/v2/trash' },
'restoreFromTrash': { method: 'POST', path: '/api/v2/trash/restore' },
'purgeTrash': { method: 'DELETE', path: '/api/v2/trash/purge' }
```

### 2. Vérifier que les endpoints API existent

Il faut s'assurer que tous ces endpoints sont bien implémentés dans `/api/v2/`.

---

## 📊 Résumé

- **Total outils définis** : 28
- **Total outils mappés** : 16
- **Outils manquants** : 12
- **Taux de couverture** : 57%

**🚨 Action immédiate requise** : Ajouter les 12 mappings manquants pour éviter les erreurs "Tool non supporté".


