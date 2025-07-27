# 💾 **PERSISTANCE LOCALE - STORE ZUSTAND**

## 📋 **VUE D'ENSEMBLE**

Le système de persistance locale permet de **conserver automatiquement** la dernière version de la note en cours d'édition dans le `localStorage` du navigateur. Cela garantit que l'utilisateur **ne perd jamais de texte non sauvegardé** après un changement d'onglet ou un refresh.

---

## 🏗️ **ARCHITECTURE**

### **Middleware Zustand Persist**
```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      // État et actions...
    }),
    {
      name: 'abrege-editor-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentNote: state.currentNote,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
    }
  )
);
```

### **Champs Persistés**
- `currentNote.id` : Identifiant de la note
- `currentNote.title` : Titre de la note
- `currentNote.content` : Contenu markdown
- `currentNote.lastModified` : Timestamp de la dernière modification
- `hasUnsavedChanges` : Indicateur de changements non sauvegardés

---

## 🎯 **FONCTIONNALITÉS**

### **1. Sauvegarde Automatique Locale**
```typescript
const { saveNoteLocally } = useEditorPersistence();

// Sauvegarder automatiquement lors des changements
saveNoteLocally(noteId, title, content);
```

### **2. Restauration Automatique**
```typescript
const { restorePersistedNote } = useEditorPersistence();

// Restaurer au chargement de la page
const persistedNote = restorePersistedNote(noteId);
if (persistedNote) {
  // Utiliser les données persistées
  setTitle(persistedNote.title);
  setContent(persistedNote.content);
}
```

### **3. Nettoyage Après Sauvegarde**
```typescript
const { clearAfterSave } = useEditorPersistence();

// Nettoyer après une sauvegarde réussie
await onSave(data);
clearAfterSave(); // Efface l'état persisté
```

### **4. Indicateur Visuel**
```typescript
import { UnsavedChangesIndicator } from '@/components/UnsavedChangesIndicator';

// Afficher l'indicateur dans l'interface
<UnsavedChangesIndicator />
```

---

## 🛠️ **UTILISATION**

### **Hook Principal**
```typescript
import { useEditorPersistence } from '@/hooks/useEditorPersistence';

const {
  currentNote,
  hasUnsavedChanges,
  saveNoteLocally,
  updateNoteContent,
  updateNoteTitle,
  clearAfterSave,
  hasUnsavedChangesForNote,
  restorePersistedNote,
  clearNote,
} = useEditorPersistence();
```

### **Exemple Complet**
```typescript
import React, { useEffect, useState } from 'react';
import { useEditorPersistence } from '@/hooks/useEditorPersistence';
import { UnsavedChangesIndicator } from '@/components/UnsavedChangesIndicator';

const MyEditor = ({ noteId, initialTitle, initialContent }) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  
  const {
    saveNoteLocally,
    restorePersistedNote,
    clearAfterSave,
    hasUnsavedChangesForNote,
  } = useEditorPersistence();

  // Restaurer au chargement
  useEffect(() => {
    const persistedNote = restorePersistedNote(noteId);
    if (persistedNote) {
      setTitle(persistedNote.title);
      setContent(persistedNote.content);
    }
  }, [noteId, restorePersistedNote]);

  // Sauvegarder automatiquement
  useEffect(() => {
    if (title !== initialTitle || content !== initialContent) {
      saveNoteLocally(noteId, title, content);
    }
  }, [noteId, title, content, saveNoteLocally]);

  const handleSave = async () => {
    await saveToServer({ title, content });
    clearAfterSave(); // Nettoyer après sauvegarde
  };

  return (
    <div>
      <UnsavedChangesIndicator />
      {/* Interface de l'éditeur */}
    </div>
  );
};
```

---

## 🔧 **CONFIGURATION**

### **1. Installation des Dépendances**
```bash
npm install zustand
```

### **2. Configuration du Store**
Le store est déjà configuré avec :
- **localStorage** comme storage
- **Partialisation** pour ne persister que les champs nécessaires
- **Versioning** pour les migrations futures
- **Migration** automatique des anciennes versions

### **3. Intégration dans l'Éditeur**
```typescript
// Dans votre composant d'éditeur
import { useEditorPersistence } from '@/hooks/useEditorPersistence';
import { UnsavedChangesIndicator } from '@/components/UnsavedChangesIndicator';

// Ajouter le hook
const { saveNoteLocally, clearAfterSave } = useEditorPersistence();

// Ajouter l'indicateur
<UnsavedChangesIndicator />
```

---

## 🎨 **INDICATEURS VISUELS**

### **1. Toast de Restauration**
```typescript
// Affiché automatiquement lors de la restauration
toast.success(
  `Version locale restaurée (${new Date(currentNote.lastModified).toLocaleTimeString()})`,
  { duration: 3000, icon: '💾' }
);
```

### **2. Indicateur Flottant**
```typescript
// Composant qui s'affiche en haut à droite
<UnsavedChangesIndicator />
```

### **3. Modification du Titre de Page**
```typescript
// Ajoute un * au titre de la page
document.title = originalTitle + ' *';
```

### **4. Avertissement de Sortie**
```typescript
// Avertit l'utilisateur s'il tente de quitter avec des changements
window.addEventListener('beforeunload', handleBeforeUnload);
```

---

## 🔒 **SÉCURITÉ ET PERFORMANCE**

### **1. Données Persistées**
- **localStorage** : Stockage local sécurisé
- **Chiffrement** : Non nécessaire (données non sensibles)
- **Taille** : Limitée aux champs essentiels

### **2. Performance**
- **Partialisation** : Seuls les champs nécessaires sont persistés
- **Debounce** : Les sauvegardes sont optimisées
- **Nettoyage** : L'état est effacé après sauvegarde

### **3. Gestion d'Erreurs**
```typescript
try {
  saveNoteLocally(noteId, title, content);
} catch (error) {
  console.error('Erreur de persistance locale:', error);
  // Fallback vers l'état normal
}
```

---

## 🧪 **TESTS**

### **1. Test de Persistance**
```typescript
// Vérifier que les données sont persistées
const store = useFileSystemStore.getState();
store.saveCurrentNoteLocally('test-id', 'Test', 'Content');
expect(localStorage.getItem('abrege-editor-state')).toBeTruthy();
```

### **2. Test de Restauration**
```typescript
// Vérifier la restauration
const persistedNote = restorePersistedNote('test-id');
expect(persistedNote?.title).toBe('Test');
```

### **3. Test de Nettoyage**
```typescript
// Vérifier le nettoyage après sauvegarde
clearAfterSave();
expect(useFileSystemStore.getState().currentNote).toBeNull();
```

---

## 🚀 **AVANTAGES**

### **1. Expérience Utilisateur**
- ✅ **Aucune perte de données** lors des changements d'onglet
- ✅ **Restauration automatique** au refresh
- ✅ **Indicateurs visuels** clairs
- ✅ **Avertissements** avant de quitter

### **2. Performance**
- ✅ **Sauvegarde optimisée** avec debounce
- ✅ **Stockage minimal** (seuls les champs essentiels)
- ✅ **Nettoyage automatique** après sauvegarde

### **3. Maintenabilité**
- ✅ **Hook réutilisable** `useEditorPersistence`
- ✅ **Composant modulaire** `UnsavedChangesIndicator`
- ✅ **Configuration centralisée** dans le store

---

## 📝 **EXEMPLES D'UTILISATION**

### **1. Éditeur Simple**
```typescript
const Editor = ({ noteId }) => {
  const { saveNoteLocally, restorePersistedNote } = useEditorPersistence();
  
  useEffect(() => {
    const persisted = restorePersistedNote(noteId);
    if (persisted) {
      // Restaurer les données
    }
  }, [noteId]);
  
  const handleChange = (content) => {
    saveNoteLocally(noteId, title, content);
  };
};
```

### **2. Éditeur Avancé**
```typescript
const AdvancedEditor = ({ noteId }) => {
  const {
    saveNoteLocally,
    restorePersistedNote,
    clearAfterSave,
    hasUnsavedChangesForNote,
  } = useEditorPersistence();
  
  // Logique complète avec indicateurs visuels
  return (
    <div>
      <UnsavedChangesIndicator />
      {/* Interface complète */}
    </div>
  );
};
```

---

## 🎯 **CONCLUSION**

Le système de persistance locale garantit une **expérience utilisateur optimale** en préservant automatiquement le travail en cours. L'implémentation est **modulaire**, **performante** et **facilement intégrable** dans n'importe quel éditeur.

**Objectif atteint** : L'utilisateur ne perd plus jamais de texte non sauvegardé ! 🎉 