# 🎨 Système Glassmorphism Unifié - Documentation

## 📋 Vue d'ensemble

Le système glassmorphism unifié de Scrivia offre un design moderne, sobre et professionnel pour toutes les pages de l'application. Il garantit une cohérence visuelle parfaite et une expérience utilisateur fluide.

## 🏗️ Architecture du système

### Fichiers principaux

1. **`glassmorphism-unified.css`** - Variables et composants glassmorphism de base
2. **`pages-unified-layout.css`** - Layout unifié pour toutes les pages
3. **`pages-specific-styles.css`** - Styles spécifiques par page
4. **`variables.css`** - Variables CSS centralisées

### Structure des pages

Toutes les pages suivent maintenant cette structure unifiée :

```tsx
<div className="page-wrapper">
  <aside className="page-sidebar-fixed">
    <Sidebar />
  </aside>
  
  <main className="page-content-area">
    {/* Titre de la page */}
    <motion.div className="page-title-container-glass">
      <div className="page-title-content">
        <div className="page-title-left-section">
          <div className="page-title-icon-container">
            <span className="page-title-icon">📚</span>
          </div>
          <div className="page-title-section">
            <h1 className="page-title">Titre de la page</h1>
            <p className="page-subtitle">Description de la page</p>
          </div>
        </div>
        <div className="page-title-stats">
          {/* Statistiques */}
        </div>
      </div>
    </motion.div>
    
    {/* Contenu principal */}
    <motion.section className="content-section-glass">
      {/* Contenu spécifique à la page */}
    </motion.section>
  </main>
</div>
```

## 🎨 Composants glassmorphism

### Containers

- **`.glass-container`** - Container principal avec effet glassmorphism
- **`.glass-card`** - Cartes avec effet glassmorphism
- **`.page-title-container-glass`** - Titre de page avec glassmorphism

### Boutons

- **`.glass-button`** - Bouton de base
- **`.glass-button.primary`** - Bouton principal
- **`.glass-button.secondary`** - Bouton secondaire
- **`.glass-button.danger`** - Bouton de danger

### Inputs

- **`.glass-input`** - Champs de saisie avec glassmorphism

### Modales

- **`.glass-modal-overlay`** - Overlay de modal
- **`.glass-modal`** - Modal avec glassmorphism

## 🎯 Variables CSS principales

### Backgrounds glassmorphism

```css
--glass-bg-primary: rgba(255, 255, 255, 0.08);
--glass-bg-secondary: rgba(255, 255, 255, 0.05);
--glass-bg-tertiary: rgba(255, 255, 255, 0.03);
--glass-bg-hover: rgba(255, 255, 255, 0.12);
```

### Bordures glassmorphism

```css
--glass-border-primary: rgba(255, 255, 255, 0.12);
--glass-border-secondary: rgba(255, 255, 255, 0.08);
--glass-border-hover: rgba(255, 255, 255, 0.18);
```

### Ombres glassmorphism

```css
--glass-shadow-subtle: 0 2px 12px rgba(0, 0, 0, 0.08);
--glass-shadow-medium: 0 4px 20px rgba(0, 0, 0, 0.12);
--glass-shadow-strong: 0 8px 32px rgba(0, 0, 0, 0.16);
```

### Effets de flou

```css
--glass-blur-light: blur(8px);
--glass-blur-medium: blur(12px);
--glass-blur-heavy: blur(20px);
```

## 📱 Responsive design

Le système s'adapte automatiquement à toutes les tailles d'écran :

- **Desktop** (>1024px) - Layout complet avec sidebar fixe
- **Tablet** (768px-1024px) - Layout adapté avec sidebar réduite
- **Mobile** (<768px) - Layout vertical avec sidebar masquée

## 🎭 Animations

### Animations de base

- **`.glass-slide-in`** - Animation d'entrée par le bas
- **`.glass-fade-in`** - Animation de fondu
- **`.glass-scale-in`** - Animation d'agrandissement

### Effets au hover

- **Brillance subtile** - Effet de shimmer sur les containers
- **Élévation** - Translation vers le haut au hover
- **Changement de couleur** - Transition des couleurs d'accent

## 🌙 Mode sombre

Le système s'adapte automatiquement au mode sombre avec des variables CSS dédiées :

```css
.dark {
  --glass-bg-primary: rgba(255, 255, 255, 0.06);
  --glass-bg-secondary: rgba(255, 255, 255, 0.04);
  /* ... autres variables sombres */
}
```

## ♿ Accessibilité

### Respect des préférences utilisateur

- **`prefers-reduced-motion`** - Désactive les animations si demandé
- **`prefers-contrast`** - Augmente le contraste si nécessaire

### Navigation clavier

- Tous les éléments interactifs sont accessibles au clavier
- Focus visible sur tous les éléments focusables
- Ordre de tabulation logique

## 🚀 Utilisation

### 1. Importer les styles

```tsx
import '@/styles/main.css';
```

### 2. Utiliser les classes

```tsx
<div className="glass-container">
  <h2 className="page-title">Mon titre</h2>
  <button className="glass-button primary">
    Mon bouton
  </button>
</div>
```

### 3. Appliquer les animations

```tsx
<motion.div 
  className="glass-card glass-slide-in"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  Contenu animé
</motion.div>
```

## 🎨 Personnalisation

### Couleurs par page

Chaque page peut avoir ses propres couleurs d'accent :

```css
/* Page dossiers */
--page-dossiers-primary: #e55a2c;

/* Page fichiers */
--page-files-primary: #f97316;

/* Page paramètres */
--page-settings-primary: #8b5cf6;

/* Page corbeille */
--page-trash-primary: #ef4444;
```

### Variables personnalisées

Vous pouvez surcharger les variables CSS pour personnaliser l'apparence :

```css
:root {
  --glass-bg-primary: rgba(255, 255, 255, 0.10); /* Plus opaque */
  --glass-border-primary: rgba(255, 255, 255, 0.15); /* Plus visible */
}
```

## 🔧 Maintenance

### Ajouter une nouvelle page

1. Utiliser la structure HTML unifiée
2. Appliquer les classes glassmorphism appropriées
3. Ajouter les styles spécifiques dans `pages-specific-styles.css` si nécessaire

### Modifier le design

1. Modifier les variables dans `glassmorphism-unified.css`
2. Tester sur toutes les pages
3. Vérifier la responsivité

## 📊 Performance

### Optimisations

- **CSS pur** - Pas de JavaScript pour les styles
- **Variables CSS** - Calculs optimisés par le navigateur
- **Backdrop-filter** - Accélération matérielle automatique
- **Transitions CSS** - Animations fluides et performantes

### Compatibilité

- **Chrome/Edge** - Support complet
- **Firefox** - Support complet
- **Safari** - Support complet avec préfixes
- **Mobile** - Support complet avec optimisations

## 🎯 Bonnes pratiques

1. **Cohérence** - Toujours utiliser les classes unifiées
2. **Performance** - Éviter les styles inline
3. **Accessibilité** - Tester avec les lecteurs d'écran
4. **Responsive** - Tester sur toutes les tailles d'écran
5. **Maintenance** - Documenter les modifications

## 🐛 Dépannage

### Problèmes courants

1. **Effet glassmorphism ne s'affiche pas**
   - Vérifier que `backdrop-filter` est supporté
   - Vérifier les variables CSS

2. **Animations saccadées**
   - Vérifier `prefers-reduced-motion`
   - Optimiser les transitions CSS

3. **Problèmes de responsive**
   - Vérifier les media queries
   - Tester sur différents appareils

### Support

Pour toute question ou problème, consulter :
- La documentation des variables CSS
- Les exemples dans les pages existantes
- Les tests de régression

---

**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2025  
**Maintenu par** : Équipe Scrivia

