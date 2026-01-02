# Notes Performance - Éditeur

## Optimisations Implémentées

### React.memo
- ✅ `EditorMainContent` : Memoization avec comparaison personnalisée
- ✅ `NoteEmbedContent` : Déjà memoizé
- ✅ `NoteEmbedView` : Déjà memoizé
- ✅ `EditorNavigationTree` : Items memoizés (FolderTreeItem, NoteTreeItem)

### Virtualisation

**Décision** : Virtualisation non implémentée pour l'instant

**Raison** :
- Tiptap/ProseMirror gère déjà efficacement les documents longs grâce à son architecture DOM virtuel
- La virtualisation d'un éditeur riche est complexe et peut casser certaines fonctionnalités (sélection, drag & drop, etc.)
- Les documents > 10K lignes sont rares dans l'usage réel

**Si nécessaire à l'avenir** :
- Évaluer l'impact réel avec des documents de 10K+ lignes
- Considérer la virtualisation uniquement pour le mode preview (readonly)
- Utiliser une bibliothèque spécialisée comme `react-window` ou `@tanstack/react-virtual`

### Autres Optimisations

- ✅ useMemo pour calculs coûteux (markdown rendering)
- ✅ useCallback pour handlers stables
- ✅ Debouncing save automatique
- ✅ Lazy loading extensions conditionnelles



