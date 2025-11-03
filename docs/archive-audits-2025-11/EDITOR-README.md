# 📘 Documentation Éditeur Scrivia

**Version**: 2.0 (Refactoring Octobre 2025)  
**Statut**: ✅ Production Ready

---

## 📚 Documentation Disponible

### 1. **[docs/EDITOR.md](docs/EDITOR.md)** - Guide Principal
**Pour**: Développeurs travaillant sur l'éditeur

**Contenu**:
- 🏗️ Architecture complète
- 🔄 Flux de données
- 🛠️ Guide de contribution (ajouter settings, extensions, etc.)
- 🐛 Debugging et problèmes communs
- ⚡ Optimisations performance
- 🧪 Tests

**À lire en premier** ✅

---

### 2. **[docs/DRAG-HANDLES.md](docs/DRAG-HANDLES.md)** - Drag Handles
**Pour**: Quiconque touche aux drag & drop

**Contenu**:
- ⚠️ Règles absolues (ne pas modifier)
- 📊 3 versions existantes (actif + backups)
- 🔧 Fonctionnement technique
- 🐛 Bug corrigé (premier chargement)
- 🧪 Checklist tests manuels
- 🎓 Historique développement

**À lire AVANT toute modification drag handles** ⚠️

---

### 3. **[docs/REFACTORING-2025-10.md](docs/REFACTORING-2025-10.md)** - Rapport Refactoring
**Pour**: Comprendre les changements récents

**Contenu**:
- 📊 8 phases réalisées
- 📈 Métriques (TOC -70%, useState -97%, etc.)
- 🔧 Hotfix appliqué
- ✅ Résultats et certification

**À lire pour contexte historique** 📖

---

## ⚡ Quick Start

### Modifier un Setting

```typescript
// 1. Utiliser le hook unifié
const updateMyField = useNoteUpdate({
  field: 'my_field',
  currentValue: editorState.ui.myField,
  errorMessage: ERROR_MESSAGES.SAVE_MY_FIELD,
});

// 2. Appeler
await updateMyField(newValue);

// Rollback automatique en cas d'erreur ✅
```

### Débugger l'Éditeur

```typescript
import { logger, LogCategory } from '@/utils/logger';

logger.debug(LogCategory.EDITOR, 'Debug info', data);
```

### Tester les Drag Handles

Voir checklist complète dans `docs/DRAG-HANDLES.md`

---

## ⚠️ Avant Toute Modification

1. **Lire** `docs/EDITOR.md` (architecture)
2. **Si drag handles concerné** → Lire `docs/DRAG-HANDLES.md`
3. **Tester** manuellement après modification
4. **Vérifier** lint et TypeScript

---

## 📊 État Actuel

| Métrique | Valeur |
|----------|--------|
| **Lignes Editor.tsx** | 1007 (vs 1386 avant) |
| **État centralisé** | 1 hook (vs 30+ useState) |
| **Imports CSS** | 1 bundle (vs 17) |
| **TypeScript strict** | 99.78% |
| **Tests unitaires** | 14 pass |
| **TOC performance** | +70% |

---

**3 docs essentielles - Tout est là** ✅

