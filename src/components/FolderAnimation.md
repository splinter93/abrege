# FolderAnimation.ts - Guide d'utilisation

Ce fichier centralise toutes les animations liées au module `FolderManager` et ses composants enfants.

## Structure

Le fichier est organisé en sections logiques :

### 1. Animations des éléments de fichier
- `fileItemVariants` : Variants pour l'animation d'apparition/disparition des fichiers
- `fileItemTransition` : Transition pour les animations de fichiers

### 2. Animations des éléments de dossier
- `folderItemVariants` : Variants pour l'animation d'apparition/disparition des dossiers
- `folderItemTransition` : Transition pour les animations de dossiers

### 3. Animations de liste
- `folderListVariants` : Variants pour l'animation de la liste des dossiers
- `fileListVariants` : Variants pour l'animation de la liste des fichiers

### 4. Animations de renommage
- `renameInputVariants` : Variants pour l'animation du champ de renommage
- `renameInputTransition` : Transition pour les animations de renommage

### 5. Animations de drag & drop
- `dragOverVariants` : Variants pour l'animation de drag over

### 6. Animations d'état
- `loadingVariants` : Variants pour l'animation de chargement
- `errorVariants` : Variants pour l'animation d'erreur
- `emptyStateVariants` : Variants pour l'animation d'état vide

### 7. Transitions génériques
- `quickTransition` : Transition rapide (0.15s)
- `mediumTransition` : Transition moyenne (0.3s)
- `slowTransition` : Transition lente (0.5s)
- `hoverTransition` : Transition pour les interactions hover (0.2s)
- `colorTransition` : Transition pour les changements de couleur (0.2s)

### 8. Animations de conteneur
- `containerVariants` : Variants pour l'animation du conteneur principal
- `contentVariants` : Variants pour l'animation du contenu

### 9. Animations de grille (Expansion/Rétraction)
- `gridExpandVariants` : Variants pour l'animation d'expansion de la grille
- `gridShrinkVariants` : Variants pour l'animation de rétraction de la grille
- `gridReorderVariants` : Variants pour l'animation de réorganisation de la grille
- `gridRowVariants` : Variants pour l'animation de ligne de grille
- `gridColumnVariants` : Variants pour l'animation de colonne de grille
- `gridTransition` : Transition fluide pour les animations de grille
- `gridReorderTransition` : Transition rapide pour les réorganisations de grille

## Utilisation

### Dans un composant avec Framer Motion

```tsx
import { motion } from 'framer-motion';
import { fileItemVariants, fileItemTransition } from './FolderAnimation';

const MyComponent = () => {
  return (
    <motion.div
      variants={fileItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={fileItemTransition}
    >
      {/* Contenu */}
    </motion.div>
  );
};
```

### Avec AnimatePresence

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { fileListVariants } from './FolderAnimation';

const MyList = ({ items }) => {
  return (
    <motion.div variants={fileListVariants}>
      <AnimatePresence>
        {items.map(item => (
          <motion.div key={item.id}>
            {/* Item content */}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
```

### Animations de grille avec layout

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { gridExpandVariants, gridTransition } from './FolderAnimation';

const GridComponent = ({ items }) => {
  return (
    <motion.div
      variants={gridExpandVariants}
      transition={gridTransition}
      layout
    >
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <motion.div
            key={item.id}
            layout
            transition={gridTransition}
          >
            {/* Grid item content */}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
```

## Conventions

1. **Noms explicites** : Tous les objets d'animation ont des noms descriptifs
2. **Organisation logique** : Les animations sont groupées par type d'élément ou d'action
3. **Documentation** : Chaque animation a un commentaire JSDoc explicatif
4. **Réutilisabilité** : Les animations sont conçues pour être réutilisables
5. **Cohérence** : Les transitions utilisent des valeurs cohérentes (ease: 'easeOut')

## Extensions futures

Ce fichier peut être étendu pour inclure :
- Animations de navigation entre dossiers
- Animations de tri et filtrage
- Animations de recherche
- Animations de sélection multiple
- Animations de menu contextuel
- Animations de pagination de grille
- Animations de zoom sur les éléments
- Animations de transition entre vues (grille/liste)

## Notes importantes

- Ce fichier ne contient que les animations spécifiques au module FolderManager
- Les animations génériques iront dans un fichier `SharedAnimation.ts` plus tard
- Les animations CSS restent dans les fichiers CSS pour les performances
- Les transitions CSS sont documentées ici pour référence 