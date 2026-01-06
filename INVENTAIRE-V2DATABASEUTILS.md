# INVENTAIRE COMPLET - V2DATABASEUTILS

**Date :** 2026-01-05  
**Fichier source :** `src/utils/v2DatabaseUtils.ts` (2372 lignes)

---

## INTERFACES/TYPES (9 interfaces)

| Ligne | Interface | Description |
|-------|-----------|-------------|
| 10 | `ContentOperation` | Opérations de contenu (insert, replace, delete, upsert_section) |
| 19 | `ShareSettings` | Paramètres de partage (visibility, allow_edit, allow_comments) |
| 27 | `AgentData` | Données agent (display_name, slug, model, system_instructions) |
| 64 | `ApiContext` | Contexte API (operation, component, userId, timestamp) |
| 72 | `CreateNoteData` | Données création note (source_title, notebook_id, markdown_content) |
| 82 | `UpdateNoteData` | Données mise à jour note (source_title, markdown_content, html_content) |
| 101 | `CreateFolderData` | Données création dossier (name, classeur_id, parent_id) |
| 107 | `UpdateFolderData` | Données mise à jour dossier (name, parent_id) |
| 112 | `CreateClasseurData` | Données création classeur (name, description, icon, emoji) |
| 119 | `UpdateClasseurData` | Données mise à jour classeur (name, description, icon, emoji, position) |

---

## MÉTHODES PAR DOMAINE (56 méthodes)

### NOTES - Queries (6 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 425 | `getNoteContent` | `(ref: string, userId: string, context: ApiContext)` | Récupérer contenu d'une note |
| 1872 | `getNote` | `(noteId: string, userId: string, context: ApiContext)` | Récupérer une note par ID |
| 1599 | `getTableOfContents` | `(ref: string, userId: string, context: ApiContext)` | Récupérer table des matières |
| 1639 | `getNoteStatistics` | `(ref: string, userId: string, context: ApiContext)` | Récupérer statistiques note |
| 2034 | `getNoteShareSettings` | `(ref: string, userId: string, context: ApiContext)` | Récupérer paramètres partage |
| 2095 | `getRecentNotes` | `(limit: number = 10, userId: string, context: ApiContext)` | Récupérer notes récentes |
| 2027 | `getNoteTOC` | `(ref: string, userId: string, context: ApiContext)` | Alias pour getTableOfContents |

### NOTES - Mutations (11 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 136 | `createNote` | `(data: CreateNoteData, userId: string, context: ApiContext)` | Créer une note |
| 203 | `updateNote` | `(ref: string, data: UpdateNoteData, userId: string, context: ApiContext)` | Mettre à jour une note |
| 348 | `deleteNote` | `(ref: string, userId: string, context: ApiContext)` | Supprimer une note |
| 472 | `addContentToNote` | `(ref: string, content: string, userId: string, context: ApiContext)` | Ajouter contenu à une note |
| 538 | `moveNote` | `(ref: string, targetFolderId: string \| null, userId: string, context: ApiContext, targetClasseurId?: string)` | Déplacer une note |
| 1386 | `insertContentToNote` | `(ref: string, content: string, position: number, userId: string, context: ApiContext)` | Insérer contenu à position |
| 1440 | `addContentToSection` | `(ref: string, sectionId: string, content: string, userId: string, context: ApiContext)` | Ajouter contenu à section |
| 1493 | `clearSection` | `(ref: string, sectionId: string, userId: string, context: ApiContext)` | Vider une section |
| 1546 | `eraseSection` | `(ref: string, sectionId: string, userId: string, context: ApiContext)` | Supprimer une section |
| 1689 | `publishNote` | `(ref: string, visibility: 'private' \| 'public' \| 'link-private' \| 'link-public' \| 'limited' \| 'scrivia', userId: string, context: ApiContext)` | Publier une note |
| 2066 | `updateNoteShareSettings` | `(ref: string, settings: ShareSettings, userId: string, context: ApiContext)` | Mettre à jour paramètres partage |
| 2011 | `applyContentOperations` | `(ref: string, operations: ContentOperation[], userId: string, context: ApiContext)` | Appliquer opérations contenu |
| 2000 | `insertNoteContent` | `(noteId: string, params: { content: string; position: number }, userId: string, context: ApiContext)` | Alias pour insertContentToNote |

### CLASSEURS - Queries (5 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 1147 | `getClasseurTree` | `(notebookId: string, userId: string, context: ApiContext)` | Récupérer arbre classeur |
| 1321 | `getClasseurs` | `(userId: string, context: ApiContext)` | Récupérer tous les classeurs |
| 1822 | `getClasseur` | `(classeurId: string, userId: string, context: ApiContext)` | Récupérer un classeur |
| 2121 | `getClasseursWithContent` | `(userId: string, context: ApiContext)` | Récupérer classeurs avec contenu |
| 2128 | `listClasseurs` | `(userId: string, context: ApiContext)` | Lister classeurs |

### CLASSEURS - Mutations (3 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 954 | `createClasseur` | `(data: CreateClasseurData, userId: string, context: ApiContext)` | Créer un classeur |
| 991 | `updateClasseur` | `(ref: string, data: UpdateClasseurData, userId: string, context: ApiContext, userToken?: string)` | Mettre à jour classeur |
| 1089 | `deleteClasseur` | `(ref: string, userId: string, context: ApiContext)` | Supprimer un classeur |
| 1261 | `reorderClasseurs` | `(classeurs: Array<{ id: string; position: number }>, userId: string, context: ApiContext)` | Réorganiser classeurs |

### DOSSIERS - Queries (2 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 1727 | `getFolderTree` | `(ref: string, userId: string, context: ApiContext)` | Récupérer arborescence dossier |
| 1847 | `getFolder` | `(folderId: string, userId: string, context: ApiContext)` | Récupérer un dossier |

### DOSSIERS - Mutations (3 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 600 | `createFolder` | `(data: CreateFolderData, userId: string, context: ApiContext, supabaseClient?: SupabaseClient)` | Créer un dossier |
| 663 | `updateFolder` | `(ref: string, data: UpdateFolderData, userId: string, context: ApiContext)` | Mettre à jour dossier |
| 756 | `moveFolder` | `(ref: string, targetParentId: string \| null, userId: string, context: ApiContext, targetClasseurId?: string)` | Déplacer dossier |
| 897 | `deleteFolder` | `(ref: string, userId: string, context: ApiContext)` | Supprimer dossier |

### AGENTS - Queries (2 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 2297 | `listAgents` | `(userId: string, context: ApiContext)` | Lister agents |
| 2313 | `getAgent` | `(agentId: string, userId: string, context: ApiContext)` | Récupérer un agent |

### AGENTS - Mutations (5 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 2305 | `createAgent` | `(data: AgentData, userId: string, context: ApiContext)` | Créer un agent |
| 2329 | `updateAgent` | `(agentId: string, data: AgentData, userId: string, context: ApiContext)` | Mettre à jour agent |
| 2337 | `patchAgent` | `(agentId: string, data: Partial<AgentData>, userId: string, context: ApiContext)` | Patcher agent |
| 2345 | `deleteAgent` | `(agentId: string, userId: string, context: ApiContext)` | Supprimer agent |
| 2321 | `executeAgent` | `(data: Record<string, unknown>, userId: string, context: ApiContext)` | Exécuter agent |

### USERS - Queries (3 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 1976 | `getUserInfo` | `(userId: string, context: ApiContext)` | Récupérer infos utilisateur |
| 2208 | `getUserProfile` | `(userId: string, context: ApiContext)` | Récupérer profil utilisateur |
| 2165 | `getStats` | `(userId: string, context: ApiContext)` | Récupérer statistiques |

### TRASH - Queries (1 méthode)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 2215 | `getTrash` | `(userId: string, context: ApiContext)` | Récupérer corbeille |

### TRASH - Mutations (3 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 2240 | `restoreFromTrash` | `(itemId: string, itemType: string, userId: string, context: ApiContext)` | Restaurer depuis corbeille |
| 2255 | `purgeTrash` | `(userId: string, context: ApiContext)` | Vider corbeille |
| 2270 | `deleteResource` | `(resourceType: string, ref: string, userId: string, context: ApiContext)` | Supprimer ressource |

### SEARCH - Queries (4 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 1897 | `searchNotes` | `(query: string, limit: number, offset: number, userId: string, context: ApiContext)` | Rechercher notes |
| 1923 | `searchClasseurs` | `(query: string, limit: number, offset: number, userId: string, context: ApiContext)` | Rechercher classeurs |
| 1949 | `searchFiles` | `(query: string, limit: number, offset: number, userId: string, context: ApiContext)` | Rechercher fichiers |
| 2135 | `searchContent` | `(query: string, type: string = 'all', limit: number = 20, userId: string, context: ApiContext)` | Rechercher contenu |

### UTILS - Queries (3 méthodes)

| Ligne | Méthode | Signature | Responsabilité |
|-------|---------|-----------|----------------|
| 1793 | `generateSlug` | `(text: string, type: 'note' \| 'classeur' \| 'folder', userId: string, context: ApiContext, supabaseClient?: SupabaseClient)` | Générer slug |
| 2353 | `listTools` | `(userId: string, context: ApiContext)` | Lister tools |
| 2361 | `debugInfo` | `(userId: string, context: ApiContext)` | Infos debug |

---

## RÉSUMÉ PAR MODULE CIBLE

### Queries (22 méthodes)
- **noteQueries.ts** : 7 méthodes (getNoteContent, getNote, getTableOfContents, getNoteStatistics, getNoteShareSettings, getRecentNotes, getNoteTOC)
- **classeurQueries.ts** : 5 méthodes (getClasseurTree, getClasseurs, getClasseur, getClasseursWithContent, listClasseurs)
- **dossierQueries.ts** : 2 méthodes (getFolderTree, getFolder)
- **agentQueries.ts** : 2 méthodes (listAgents, getAgent)
- **userQueries.ts** : 3 méthodes (getUserInfo, getUserProfile, getStats)
- **trashQueries.ts** : 1 méthode (getTrash)
- **searchQueries.ts** : 4 méthodes (searchNotes, searchClasseurs, searchFiles, searchContent)
- **utilsQueries.ts** : 3 méthodes (generateSlug, listTools, debugInfo)

### Mutations (22 méthodes)
- **noteMutations.ts** : 13 méthodes (createNote, updateNote, deleteNote, addContentToNote, moveNote, insertContentToNote, addContentToSection, clearSection, eraseSection, publishNote, updateNoteShareSettings, applyContentOperations, insertNoteContent)
- **classeurMutations.ts** : 4 méthodes (createClasseur, updateClasseur, deleteClasseur, reorderClasseurs)
- **dossierMutations.ts** : 4 méthodes (createFolder, updateFolder, moveFolder, deleteFolder)
- **agentMutations.ts** : 5 méthodes (createAgent, updateAgent, patchAgent, deleteAgent, executeAgent)
- **trashMutations.ts** : 3 méthodes (restoreFromTrash, purgeTrash, deleteResource)

---

## TOTAL : 56 méthodes + 9 interfaces

