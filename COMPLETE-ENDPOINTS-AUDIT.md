# 🚨 AUDIT COMPLET - Endpoints API V2 vs Mapping

## 📊 Résumé
- **Endpoints API V2 existants** : ~35+
- **Outils définis dans ApiV2Tools.ts** : 28
- **Outils mappés dans openApiToolExecutor.ts** : 16
- **Taux de couverture** : 45% (16/35)

---

## 🔍 TOUS LES ENDPOINTS API V2 EXISTANTS

### 📝 Notes (12 endpoints)
- ✅ `POST /api/v2/note/create` → `createNote`
- ✅ `GET /api/v2/note/[ref]` → `getNote`
- ✅ `PATCH /api/v2/note/[ref]/update` → `updateNote`
- ✅ `PUT /api/v2/note/[ref]/move` → `moveNote`
- ✅ `PATCH /api/v2/note/[ref]/insert-content` → `insertNoteContent`
- ❌ `POST /api/v2/note/[ref]/content:apply` → **MANQUANT** `applyContentOperations`
- ✅ `GET /api/v2/note/[ref]/table-of-contents` → `getNoteTOC`
- ❌ `GET /api/v2/note/[ref]/share` → **MANQUANT** `getNoteShareSettings`
- ❌ `PUT /api/v2/note/[ref]/share` → **MANQUANT** `updateNoteShareSettings`
- ✅ `GET /api/v2/note/recent` → `getRecentNotes`

### 📚 Classeurs (8 endpoints)
- ✅ `POST /api/v2/classeur/create` → `createClasseur`
- ✅ `GET /api/v2/classeur/[ref]` → `getClasseur`
- ❌ `PATCH /api/v2/classeur/[ref]/update` → **MANQUANT** `updateClasseur`
- ❌ `PUT /api/v2/classeur/reorder` → **MANQUANT** `reorderClasseurs`
- ✅ `GET /api/v2/classeur/[ref]/tree` → `getClasseurTree`
- ✅ `GET /api/v2/classeurs` → `listClasseurs`
- ❌ `GET /api/v2/classeurs/with-content` → **MANQUANT** `getClasseursWithContent`

### 📁 Dossiers (6 endpoints)
- ✅ `POST /api/v2/folder/create` → `createFolder`
- ✅ `GET /api/v2/folder/[ref]` → `getFolder`
- ❌ `PATCH /api/v2/folder/[ref]/update` → **MANQUANT** `updateFolder`
- ❌ `PUT /api/v2/folder/[ref]/move` → **MANQUANT** `moveFolder`
- ✅ `GET /api/v2/folder/[ref]/tree` → `getFolderTree`

### 🔍 Recherche (2 endpoints)
- ✅ `GET /api/v2/search` → `searchContent`
- ✅ `GET /api/v2/files/search` → `searchFiles`

### 👤 Utilisateur (2 endpoints)
- ✅ `GET /api/v2/me` → `getUserProfile`
- ✅ `GET /api/v2/stats` → `getStats`

### 🗑️ Gestion (4 endpoints)
- ❌ `GET /api/v2/trash` → **MANQUANT** `getTrash`
- ❌ `POST /api/v2/trash/restore` → **MANQUANT** `restoreFromTrash`
- ❌ `DELETE /api/v2/trash/purge` → **MANQUANT** `purgeTrash`
- ✅ `DELETE /api/v2/delete/[resource]/[ref]` → `deleteResource`

### 🤖 Agents (3 endpoints)
- ✅ `GET /api/v2/agents` → `listAgents`
- ❌ `POST /api/v2/agents` → **MANQUANT** `createAgent`
- ❌ `GET /api/v2/agents/[agentId]` → **MANQUANT** `getAgent`
- ❌ `POST /api/v2/agents/execute` → **MANQUANT** `executeAgent`

### 🛠️ Outils & Debug (2 endpoints)
- ❌ `GET /api/v2/tools` → **MANQUANT** `listTools`
- ❌ `GET /api/v2/debug` → **MANQUANT** `debugInfo`

---

## 🚨 OUTILS MANQUANTS DANS LE MAPPING (19 outils)

### 1. Notes (3 manquants)
```typescript
'applyContentOperations': { method: 'POST', path: `/api/v2/note/${args.ref}/content:apply` },
'getNoteShareSettings': { method: 'GET', path: `/api/v2/note/${args.ref}/share` },
'updateNoteShareSettings': { method: 'PUT', path: `/api/v2/note/${args.ref}/share` }
```

### 2. Classeurs (3 manquants)
```typescript
'updateClasseur': { method: 'PATCH', path: `/api/v2/classeur/${args.ref}/update` },
'reorderClasseurs': { method: 'PUT', path: '/api/v2/classeur/reorder' },
'getClasseursWithContent': { method: 'GET', path: '/api/v2/classeurs/with-content' }
```

### 3. Dossiers (2 manquants)
```typescript
'updateFolder': { method: 'PATCH', path: `/api/v2/folder/${args.ref}/update` },
'moveFolder': { method: 'PUT', path: `/api/v2/folder/${args.ref}/move` }
```

### 4. Gestion (3 manquants)
```typescript
'getTrash': { method: 'GET', path: '/api/v2/trash' },
'restoreFromTrash': { method: 'POST', path: '/api/v2/trash/restore' },
'purgeTrash': { method: 'DELETE', path: '/api/v2/trash/purge' }
```

### 5. Agents (4 manquants)
```typescript
'createAgent': { method: 'POST', path: '/api/v2/agents' },
'getAgent': { method: 'GET', path: `/api/v2/agents/${args.agentId}` },
'executeAgent': { method: 'POST', path: '/api/v2/agents/execute' }
```

### 6. Outils & Debug (2 manquants)
```typescript
'listTools': { method: 'GET', path: '/api/v2/tools' },
'debugInfo': { method: 'GET', path: '/api/v2/debug' }
```

---

## 🔧 ACTIONS REQUISES

### 1. Ajouter les 19 mappings manquants
### 2. Ajouter les outils manquants dans ApiV2Tools.ts
### 3. Vérifier que tous les endpoints fonctionnent

**🚨 URGENT** : 19 outils causent des erreurs "Tool non supporté" !

---

## 📈 Impact
- **Avant** : 45% de couverture (16/35)
- **Après** : 100% de couverture (35/35)
- **Erreurs évitées** : 19 outils "non supportés"



