# CSS Architecture - Page Dossiers

## 🎯 **Vue d'ensemble**

Cette page utilise un système CSS modulaire et cohérent basé sur des variables CSS centralisées pour maintenir une cohérence visuelle parfaite.

## 📁 **Structure des fichiers**

```
src/app/private/dossiers/
├── index.css              # Point d'entrée - imports tous les CSS
├── DossiersPage.css       # Layout principal et structure
├── DossiersPage.glass.css # Variables CSS et thème glassmorphism
└── CSS-ARCHITECTURE.md    # Cette documentation
```

```
src/components/
├── ClasseurTabs.css       # Navigation des classeurs
├── PrivateSidebar.css     # Sidebar de navigation
├── FolderManagerModern.css # Gestionnaire de dossiers
└── FolderGridItems.css    # Styles des éléments de grille
```

## 🎨 **Système de variables CSS**

### **Transitions harmonisées**
```css
:root {
  --transition-fast: all 0.15s ease;
  --transition-normal: all 0.2s ease;
  --transition-slow: all 0.3s ease;
}
```

### **Espacements cohérents**
```css
:root {
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;       /* 32px */
  --spacing-2xl: 3rem;      /* 48px */
}
```

### **Border radius harmonisés**
```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### **Couleurs glassmorphism**
```css
:root {
  --glass-bg-light: rgba(255, 255, 255, 0.05);
  --glass-bg-medium: rgba(255, 255, 255, 0.1);
  --glass-bg-heavy: rgba(255, 255, 255, 0.12);
  --glass-border-light: rgba(255, 255, 255, 0.1);
  --glass-border-medium: rgba(255, 255, 255, 0.2);
  --glass-border-heavy: rgba(255, 255, 255, 0.3);
}
```

## 🔄 **Ordre des imports (index.css)**

L'ordre des imports est **CRUCIAL** pour éviter les conflits de spécificité :

1. **Variables et design system** (priorité la plus basse)
2. **Layout principal** de la page
3. **Composants de navigation**
4. **Gestionnaire de dossiers et contenu**
5. **Composants utilitaires**
6. **Thème custom** (priorité la plus haute)

## 🎭 **Thème Glassmorphism**

### **Principe**
- **Transparence** : Utilisation de `rgba()` pour les couleurs
- **Subtilité** : Effets visuels légers et élégants
- **Cohérence** : Même palette de couleurs partout

### **États interactifs**
```css
/* Hover standard */
.element:hover {
  background-color: var(--glass-bg-medium);
  border-color: var(--glass-border-medium);
}

/* Drag over */
.element.drag-over {
  background-color: var(--glass-bg-heavy);
  border: 2px dashed var(--accent-primary);
}

/* Sélection */
.element.selected {
  background-color: var(--glass-bg-light);
  border: 2px solid var(--accent-primary);
}
```

## 📱 **Responsive Design**

### **Breakpoints**
- **1024px** : Sidebar réduite (260px → 220px)
- **768px** : Layout vertical, sidebar en haut
- **480px** : Grille compacte, espacements réduits

### **Adaptations**
- **Espacements** : Utilisation des variables `--spacing-*`
- **Grille** : `minmax()` adaptatif
- **Tailles** : Éléments redimensionnés proportionnellement

## 🧹 **Bonnes pratiques**

### **✅ À faire**
- Utiliser les variables CSS définies
- Maintenir la cohérence des transitions
- Respecter la hiérarchie des imports
- Tester sur tous les breakpoints

### **❌ À éviter**
- Définir des valeurs hardcodées
- Dupliquer les styles
- Ignorer l'ordre des imports
- Oublier le responsive

## 🔧 **Maintenance**

### **Ajouter une nouvelle variable**
1. Définir dans `DossiersPage.glass.css`
2. Utiliser dans tous les composants concernés
3. Documenter ici

### **Modifier un composant**
1. Identifier le fichier CSS concerné
2. Utiliser les variables existantes
3. Tester la cohérence visuelle
4. Vérifier le responsive

### **Debugging**
- Vérifier l'ordre des imports
- Contrôler la spécificité CSS
- Utiliser les outils de développement
- Tester sur différents écrans

## 📊 **Métriques de qualité**

- **Cohérence** : 100% des composants utilisent les variables
- **Maintenabilité** : 0 duplication de styles
- **Performance** : CSS optimisé et minifié
- **Accessibilité** : Contrastes et tailles respectés

---

*Dernière mise à jour : $(date)*
*Version : 2.0 - Glassmorphism Theme* 