# Folder Manager (Gestionnaire de dossiers/fichiers)

Ce dossier regroupe tous les composants, hooks et types liés à la gestion des dossiers et fichiers (Folder Manager) de l’application Abrege.

## ✨ **Vue d’ensemble**
Le Folder Manager permet de :
- Naviguer dans une arborescence de dossiers et fichiers (notes)
- Créer, renommer, supprimer, déplacer (drag & drop) dossiers et fichiers
- Gérer l’imbrication (dossiers dans dossiers, fichiers dans dossiers)
- Offrir une UX moderne, minimaliste, inspirée de macOS/Notion

---

## 🗂️ **Composants principaux**

- **`FolderManagerDossier.tsx`** :
  - Container principal pour l’intérieur d’un dossier
  - Orchestration de l’état, navigation, context menu, drag & drop, header, etc.
  - Utilise le hook `useFolderManagerState`

- **`FolderManager.tsx`** :
  - Variante pour la racine d’un classeur
  - Même logique, adaptée à la racine

- **`FolderContent.tsx`** :
  - Affiche la grille des dossiers et fichiers
  - Délègue à `FolderItem` et `FileItem`

- **`FolderItem.tsx` / `FileItem.tsx`** :
  - Tuiles individuelles (dossier/fichier)
  - Gèrent le drag, drop, renommage inline, menu contextuel

- **`FolderToolbar.tsx`** :
  - Barre d’outils (création, vue grille/liste…)

- **`FolderContextMenu.tsx`** :
  - Menu contextuel custom (clic droit)

---

## 🧠 **Hooks & logique métier**

- **`useFolderManagerState.ts`** :
  - Centralise toute la logique métier (CRUD, navigation, DnD, renommage, imbrication…)
  - Fournit un état et des méthodes :
    - `folders`, `files`, `loading`, `error`
    - `createFolder`, `createFile`, `deleteFolder`, `deleteFile`
    - `startRename`, `submitRename`, `cancelRename`
    - `reorderFolders`, `reorderFiles`, `moveItem`
    - `goToFolder`, `goBack`
  - **À utiliser dans les containers uniquement**

- **`useContextMenu.ts`** :
  - Gère l’état du menu contextuel (position, item sélectionné, ouverture/fermeture)

---

## 🏷️ **Types partagés**

- **`types.ts`** :
  - Définit les interfaces `Folder`, `FileArticle`, etc.
  - À utiliser partout pour un typage strict

---

## ⚡ **Drag & Drop (Imbrication)**
- Drag & drop natif HTML5 (pas d’effet visuel, UX sobre)
- On peut déplacer un dossier/fichier dans un autre dossier (imbrication profonde supportée)
- La logique d’imbrication est dans `moveItem` du hook

---

## 🧩 **Extensibilité & bonnes pratiques**
- **Ajoutez vos features** dans des sous-composants ou hooks dédiés
- **Gardez la logique métier** dans les hooks, pas dans les composants UI
- **Respectez les types** (TypeScript strict)
- **Testez** la logique métier (voir `useFolderManagerState.test.ts`)
- **Documentez** toute nouvelle API ou comportement complexe

---

## 🛠️ **Contribution**
- Forkez, créez une branche, PR avec description claire
- Ajoutez des tests pour toute nouvelle logique
- Gardez l’UI minimaliste et cohérente avec le design system
- Préférez la composition à l’héritage

---

## 📚 **À venir / TODO**
- Pagination/virtualisation pour les gros dossiers
- Feedback UX sur les erreurs
- Effets visuels DnD optionnels
- API batch actions
- Documentation technique détaillée (diagrammes, schémas)

---

**Pour toute question ou suggestion, ouvrez une issue ou contactez l’équipe !** 