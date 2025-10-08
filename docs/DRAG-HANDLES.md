# 🎯 Drag Handles - Documentation Complète

**Version**: 2.0  
**Statut**: ✅ Fonctionnel  
**Effort développement**: 20-40h

---

## ⚠️ RÈGLES ABSOLUES

❌ **INTERDICTIONS**:
- Supprimer une extension drag handle
- Modifier la logique fonctionnelle
- Supprimer un fichier CSS drag handle
- Modifier la configuration sans audit complet

✅ **AUTORISÉ**:
- Documenter
- Créer tests
- Signaler bugs avec reproduction

---

## 📊 Versions Existantes

### Extension ACTIVE ✅

**`NotionDragHandleExtension`**
- **Fichier**: `src/extensions/NotionDragHandleExtension.tsx` (258 lignes)
- **Status**: ✅ **ACTIVE** dans production
- **CSS**: `src/styles/notion-drag-handle.css`
- **Méthode**: Officielle Tiptap avec `view.dragging`
- **Style**: 6 points style Notion
- **Config**:
```typescript
NotionDragHandleExtension.configure({
  handleClass: 'notion-drag-handle',
})
```

### Extensions BACKUP

**`SimpleDragHandleExtension`**
- **Fichier**: `src/extensions/SimpleDragHandleExtension.ts` (407 lignes)
- **Status**: Importée mais non utilisée
- **Raison**: Backup fonctionnel
- **Action**: **CONSERVER**

**`DragHandleExtension`**
- **Fichier**: `src/extensions/DragHandleExtension.ts` (604 lignes)
- **Status**: Non importée
- **Raison**: Référence historique
- **Action**: **CONSERVER**

### CSS (3 fichiers conservés)

1. `notion-drag-handle.css` - **ACTIF**
2. `drag-handle.css` - Backup SimpleDragHandle
3. `tiptap-drag-handle-official.css` - Référence DragHandle

**Tous importés via `editor-bundle.css`**

---

## 🔧 Fonctionnement Technique

### Initialisation

1. Extension montée par Tiptap
2. Au premier `mousemove`, création du handle DOM
3. Handle positionné en `absolute`
4. Apparaît au hover (opacity 0→1)

### Drag & Drop

1. User hover → Handle visible
2. User dragstart → ProseMirror slice créé
3. `view.dragging = { slice, move: true }`
4. ProseMirror gère drop/insert/delete automatiquement

### 🐛 Bug Corrigé - Premier Chargement

**Symptôme**: Drag handles n'apparaissaient pas au premier chargement, besoin de refresh

**Cause**: `EditorSyncManager` appelait `setContent()` trop tôt, réinitialisait le DOM

**Fix appliqué**:
```typescript
// EditorSyncManager.tsx
const isFirstMountRef = React.useRef(true);

if (isFirstMountRef.current) {
  isFirstMountRef.current = false;
  return; // Skip sync au premier mount
}
```

**Résultat**: ✅ Drag handles fonctionnent dès le premier chargement

---

## 🧪 Tests Manuels

### Checklist Obligatoire

Tester APRÈS chaque modification majeure:

- [ ] **Premier chargement**: Ouvrir note → hover → handle apparaît
- [ ] **Drag & drop**: Cliquer handle → déplacer haut/bas → bloc se déplace
- [ ] **Types de blocs**: Tester sur paragraphes, headings, listes, tables
- [ ] **Synchronisation**: 2 onglets → modifier 1 → handles OK dans l'autre
- [ ] **Après refresh**: Cmd+R → handles toujours fonctionnels
- [ ] **Pas de conflit**: Sélection texte fonctionne normalement
- [ ] **Console**: Aucune erreur JavaScript

**Si 1 seul test échoue** → Rollback immédiat

---

## 🎓 Historique Développement

### Pourquoi 3 Versions ?

1. **DragHandleExtension** (première tentative):
   - Complexe (604 lignes)
   - Custom logic complète
   - Problèmes de compatibilité

2. **SimpleDragHandleExtension** (simplification):
   - Plus simple (407 lignes)
   - Drag natif ProseMirror
   - Meilleure performance

3. **NotionDragHandleExtension** (version finale):
   - Méthode officielle Tiptap
   - Style moderne Notion
   - **Version en production** ✅

**Toutes conservées**: Backup + référence historique

---

## 🚀 Déploiement

**Avant tout déploiement touchant l'éditeur**:

1. Tester les 7 points de la checklist
2. Vérifier console (0 erreur)
3. Tester sur staging
4. Si OK → Production

**En cas de problème** :
```bash
git revert <commit-hash>
# Rollback immédiat
```

---

**Documentation complète - Ne pas modifier sans expertise**

