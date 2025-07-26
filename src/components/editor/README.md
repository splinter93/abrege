# Structure des fichiers CSS de l'éditeur

## 📁 Organisation des styles

Les styles de l'éditeur ont été organisés de manière modulaire pour une meilleure maintenabilité :

### **Fichiers CSS par composant**

| Fichier | Composant | Description |
|---------|-----------|-------------|
| `editor-header.css` | Header | Styles du header, toolbar, boutons, kebab menu, actions |
| `editor-title.css` | Title | Styles du titre de l'éditeur |
| `editor-content.css` | Content | Styles du contenu principal (texte, paragraphes, listes) |
| `editor-footer.css` | Footer | Styles du footer avec statistiques |
| `editor-toc.css` | TOC | Styles de la table des matières |
| `editor-slash-menu.css` | Slash Menu | Styles du menu slash commands |
| `editor-header-image.css` | Header Image | Styles de l'image d'en-tête et menu d'insertion d'images |
| `editor-table.css` | Tables | Styles des tableaux |
| `editor-code.css` | Code | Styles des blocs de code et bouton copy |
| `editor-modal.css` | Modal | Styles des modales de l'éditeur |

### **Fichiers CSS globaux**

| Fichier | Description |
|---------|-------------|
| `src/styles/editor.css` | Styles généraux de l'éditeur (maintenant épuré) |
| `src/styles/markdown.css` | Styles du rendu markdown |
| `src/styles/typography.css` | Styles typographiques |
| `src/styles/design-system.css` | Variables CSS et design system |

## 🔄 Migration effectuée

### **Avant**
- `editor.css` : 1170 lignes avec tous les styles mélangés
- Difficile de maintenir et modifier des styles spécifiques

### **Après**
- `editor.css` : 78 lignes (styles généraux uniquement)
- 10 fichiers CSS modulaires pour chaque composant
- Maintenance et modifications facilitées

## 📋 Règles de maintenance

1. **Nouveau composant** → Créer un fichier CSS dédié
2. **Modification de style** → Modifier le fichier CSS du composant concerné
3. **Styles généraux** → Utiliser `editor.css` ou les fichiers globaux
4. **Variables CSS** → Toujours dans `design-system.css`

## 🎯 Avantages

- ✅ **Maintenabilité** : Chaque composant a ses styles isolés
- ✅ **Lisibilité** : Structure claire et organisée
- ✅ **Performance** : Chargement optimisé des styles
- ✅ **Évolutivité** : Facile d'ajouter de nouveaux composants
- ✅ **Debugging** : Plus facile de localiser les problèmes de style

## 🔧 Optimisations récentes

### **Fusions effectuées**
- `editor-actions.css` → Fusionné dans `editor-header.css`
- `editor-image-menu.css` → Fusionné dans `editor-header-image.css`

### **Résultat**
- **10 fichiers CSS** au lieu de 12 (réduction de 17%)
- Meilleure organisation logique
- Moins de fragmentation

## 🚨 Résolution des conflits CSS

### **Conflits identifiés et résolus**

#### **1. Variables en conflit entre `typography.css` et `editor.css`**
- `--editor-text-color`, `--editor-accent-primary`, etc.
- **Solution** : Suppression des variables dupliquées dans `editor.css`

#### **2. Variables en conflit entre `design-system.css` et `typography.css`**
- `--accent-primary`, `--accent-hover`, `--text-1`, etc.
- **Solution** : Réorganisation de l'ordre d'import dans `layout.tsx`

#### **3. Ordre d'import corrigé**
```typescript
// Ordre correct (typography.css avant design-system.css)
import '../styles/typography.css';      // Variables éditeur
import '../styles/design-system.css';   // Variables globales
import '../styles/editor.css';          // Styles spécifiques
```

### **Variables CSS harmonisées**
- **`typography.css`** : Variables spécifiques à l'éditeur
- **`design-system.css`** : Variables globales de l'application
- **`editor.css`** : Variables spécifiques à l'éditeur uniquement

### **Résultat final**
- ✅ **Aucun conflit de variables CSS**
- ✅ **Ordre d'import optimisé**
- ✅ **Variables harmonisées**
- ✅ **Application fonctionnelle** 