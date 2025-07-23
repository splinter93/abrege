# 🗂️ Store Zustand - Système de Fichiers Temps Réel

## 🎯 Objectif

Centraliser toutes les mutations de données (notes, dossiers, classeurs) dans le store Zustand pour permettre une synchronisation temps réel fluide avec Supabase.

## 📋 Structure

### Types de Base
```typescript
interface Note {
  id: string;
  source_title: string;     // Titre de la note
  source_type?: string;     // Type de source
  updated_at?: string;      // Date de mise à jour
  classeur_id?: string;     // ID du classeur parent
  folder_id?: string | null; // ID du dossier parent
  markdown_content?: string; // Contenu markdown
  html_content?: string;    // Contenu HTML
}

interface Folder {
  id: string;
  name: string;             // Nom du dossier
  parent_id?: string | null; // ID du dossier parent
  classeur_id?: string;     // ID du classeur parent
}

interface Classeur {
  id: string;
  name: string;             // Nom du classeur
}
```

## 🔧 Actions de Mutation (LOCALES SEULEMENT)

### Notes
```typescript
// Ajouter une note
addNote: (note: Note) => void

// Supprimer une note
removeNote: (id: string) => void

// Mettre à jour une note (patch partiel)
updateNote: (id: string, patch: Partial<Note>) => void

// Renommer une note
renameNote: (id: string, title: string) => void

// Déplacer une note
moveNote: (id: string, folder_id: string | null, classeur_id?: string) => void

// Mettre à jour le contenu d'une note (realtime editor)
updateNoteContent: (noteId: string, patch: EditorPatch) => void
```

### Dossiers
```typescript
// Ajouter un dossier
addFolder: (folder: Folder) => void

// Supprimer un dossier
removeFolder: (id: string) => void

// Mettre à jour un dossier (patch partiel)
updateFolder: (id: string, patch: Partial<Folder>) => void

// Renommer un dossier
renameFolder: (id: string, name: string) => void

// Déplacer un dossier
moveFolder: (id: string, parent_id: string | null, classeur_id?: string) => void
```

### Classeurs
```typescript
// Ajouter un classeur
addClasseur: (classeur: Classeur) => void

// Supprimer un classeur
removeClasseur: (id: string) => void

// Mettre à jour un classeur (patch partiel)
updateClasseur: (id: string, patch: Partial<Classeur>) => void

// Renommer un classeur
renameClasseur: (id: string, name: string) => void

// Définir le classeur actif
setActiveClasseurId: (id: string) => void
```

## 🚀 Utilisation

### Dans un composant React
```typescript
import { useFileSystemStore } from '@/store/useFileSystemStore';

function MyComponent() {
  // Lire l'état
  const notes = useFileSystemStore(s => s.notes);
  const folders = useFileSystemStore(s => s.folders);
  const activeClasseurId = useFileSystemStore(s => s.activeClasseurId);
  
  // Actions de mutation
  const addNote = useFileSystemStore(s => s.addNote);
  const removeNote = useFileSystemStore(s => s.removeNote);
  const updateNote = useFileSystemStore(s => s.updateNote);
  
  // Exemple d'utilisation
  const handleCreateNote = () => {
    const newNote: Note = {
      id: generateId(),
      source_title: 'Nouvelle note',
      classeur_id: activeClasseurId,
      folder_id: currentFolderId,
      markdown_content: '# Nouvelle note'
    };
    addNote(newNote);
  };
  
  const handleRenameNote = (id: string, newTitle: string) => {
    updateNote(id, { source_title: newTitle });
  };
}
```

## ⚠️ Règles Importantes

### 1. Mutations Locales Seulement
- **Toutes les actions du store sont des mutations locales**
- **Aucun fetch ou appel API dans le store**
- **Aucun effet secondaire dans le store**

### 2. Flux de Données
```
UI (React) → Zustand (mutation locale) → Supabase (via services)
                ↓
            Realtime Supabase → Zustand (patch local)
```

### 3. Synchronisation
- Les mutations locales sont immédiates (UX fluide)
- Supabase Realtime synchronise automatiquement
- Pas de polling ou de refetch manuel

## 🔄 Prochaines Étapes

1. **Étape 2** : Reconnecter Supabase Realtime
2. **Étape 3** : Réactiver les souscriptions dans DossiersPage
3. **Étape 4** : Assainir les handlers UI

## 📝 Notes de Développement

- Les types correspondent maintenant à `FileArticle` et `Folder`
- Toutes les actions sont pures (pas d'effet secondaire)
- Le store est optimisé pour le temps réel
- Les mutations sont atomiques et réversibles 