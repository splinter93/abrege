# Système de Navigation Imbriquée - DossiersPage

## 🎯 Objectif

Implémenter un système de navigation hiérarchique fonctionnel dans `DossiersPage` permettant de naviguer dans l'arborescence des dossiers et d'afficher uniquement le contenu pertinent à chaque niveau.

## ✅ Modifications Apportées

### 1. Filtrage des Dossiers (`filteredFolders`)

**Logique de filtrage :**
- **À la racine** (`currentFolderId === undefined`) : Affiche seulement les dossiers sans parent (`parent_id === null`)
- **Dans un dossier** (`currentFolderId` défini) : Affiche seulement les sous-dossiers du dossier courant (`parent_id === currentFolderId`)

**Code :**
```typescript
const filteredFolders = React.useMemo(() => {
  if (!activeClasseurId) return [];
  
  return folders.filter(f => {
    // Filtre par classeur
    if (f.classeur_id !== activeClasseurId) return false;
    
    // Filtre par parent_id pour navigation imbriquée
    if (currentFolderId === undefined) {
      // À la racine : afficher seulement les dossiers sans parent
      return f.parent_id === null;
    } else {
      // Dans un dossier : afficher seulement les sous-dossiers du dossier courant
      return f.parent_id === currentFolderId;
    }
  });
}, [folders, activeClasseurId, currentFolderId]);
```

### 2. Filtrage des Notes (`filteredNotes`)

**Logique de filtrage :**
- **À la racine** (`currentFolderId === undefined`) : Affiche seulement les notes sans dossier (`folder_id === null`)
- **Dans un dossier** (`currentFolderId` défini) : Affiche seulement les notes du dossier courant (`folder_id === currentFolderId`)

**Code :**
```typescript
const filteredNotes = React.useMemo(() => {
  if (!activeClasseurId) return [];
  
  return notes.filter(n => {
    // Filtre par classeur
    if (n.classeur_id !== activeClasseurId) return false;
    
    // Filtre par folder_id pour navigation imbriquée
    if (currentFolderId === undefined) {
      // À la racine : afficher seulement les notes sans dossier
      return n.folder_id === null;
    } else {
      // Dans un dossier : afficher seulement les notes du dossier courant
      return n.folder_id === currentFolderId;
    }
  });
}, [notes, activeClasseurId, currentFolderId]);
```

### 3. Handlers de Navigation

**Ouverture d'un dossier :**
```typescript
const handleFolderOpen = useCallback((folder: { id: string }) => setCurrentFolderId(folder.id), []);
```

**Retour à la racine :**
```typescript
const handleGoBack = useCallback(() => setCurrentFolderId(undefined), []);
```

### 4. Passage des Props au FolderManager

Les données filtrées sont passées au `FolderManager` :
```typescript
<FolderManager
  // ... autres props
  parentFolderId={currentFolderId}
  onFolderOpen={handleFolderOpen}
  onGoBack={handleGoBack}
  filteredFolders={filteredFolders}
  filteredNotes={filteredNotes}
/>
```

## 🔄 Flux de Navigation

1. **État initial** : `currentFolderId = undefined` → Affichage racine
2. **Clic sur un dossier** : `setCurrentFolderId(folder.id)` → Affichage du contenu du dossier
3. **Clic sur "Retour"** : `setCurrentFolderId(undefined)` → Retour à la racine
4. **Changement de classeur** : `currentFolderId` est conservé mais le filtrage se fait sur le nouveau classeur

## 🧪 Tests de Validation

Le système a été testé avec des données de test et fonctionne correctement :

- ✅ **Racine** : Dossiers sans parent + notes sans dossier
- ✅ **Niveau 1** : Sous-dossiers + notes du dossier courant
- ✅ **Niveau 2+** : Navigation profonde fonctionnelle
- ✅ **Retour** : Navigation inverse fonctionnelle

## 🎯 Résultat

Chaque dossier affiche maintenant uniquement ses sous-dossiers et ses notes, avec un système de navigation hiérarchique fonctionnel permettant de naviguer dans l'arborescence de manière intuitive. 