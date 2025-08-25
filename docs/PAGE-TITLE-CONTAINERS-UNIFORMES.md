# 🎨 CONTAINERS DE TITRE UNIFORMES - SYSTÈME COMPLET

## 🎯 OBJECTIF

Uniformiser tous les containers de titre des pages avec des **proportions et hauteurs identiques** pour une cohérence visuelle parfaite.

## ✨ CARACTÉRISTIQUES UNIFORMES

### **Dimensions Standardisées**
- **Hauteur minimale** : `120px` (uniforme sur toutes les pages)
- **Padding** : `32px` (2rem) sur tous les côtés
- **Espacement interne** : `gap: 32px` entre les éléments

### **Style Glassmorphism Unifié**
- **Background** : `rgba(255, 255, 255, 0.08)` par défaut
- **Bordure** : `1px solid rgba(255, 255, 255, 0.12)`
- **Rayon** : `20px` (border-radius uniforme)
- **Effet blur** : `backdrop-filter: blur(20px)`
- **Ombres** : Système d'ombres cohérent

### **Animations Standardisées**
- **Hover** : `translateY(-2px)` + ombre renforcée
- **Transition** : `0.25s ease` pour tous les éléments
- **Entrée** : Animation `fadeInSlideUp` uniforme

## 🚀 UTILISATION

### **1. Classes CSS Directes**

```tsx
<div className="page-title-container-glass">
  <div className="page-title-content">
    <div className="page-title-icon-container">
      <span className="page-title-icon">📚</span>
    </div>
    
    <div className="page-title-section">
      <h1 className="page-title">Titre de la Page</h1>
      <p className="page-subtitle">Sous-titre optionnel</p>
    </div>
    
    <div className="page-title-stats">
      <div className="page-title-stats-item">
        <span className="page-title-stats-number">42</span>
        <span className="page-title-stats-label">Éléments</span>
      </div>
    </div>
  </div>
</div>
```

### **2. Composant Réutilisable**

```tsx
import PageTitleContainer from '@/components/PageTitleContainer';

// Utilisation simple
<PageTitleContainer
  icon="📚"
  title="Mes Classeurs"
  subtitle="Organisez vos connaissances"
/>

// Avec statistiques
<PageTitleContainer
  icon="📁"
  title="Mes Fichiers"
  subtitle="Gérez vos documents"
  stats={[
    { number: 24, label: "Fichiers" },
    { number: "85%", label: "Utilisé" }
  ]}
/>

// Sans animation initiale
<PageTitleContainer
  icon="🗑️"
  title="Corbeille"
  initialAnimation={false}
/>
```

## 📱 RESPONSIVE AUTOMATIQUE

### **Tablette (≤768px)**
- Hauteur : `100px`
- Padding : `24px`
- Icône : `56x56px`
- Titre : `28px`
- Sous-titre : `14px`

### **Mobile (≤480px)**
- Hauteur : `90px`
- Padding : `20px`
- Layout : Vertical (column)
- Icône : `48x48px`
- Titre : `24px`
- Stats : Pleine largeur

## 🎨 PERSONNALISATION

### **Variables CSS Personnalisables**

```css
:root {
  /* Couleurs des icônes */
  --page-title-icon-bg: rgba(229, 90, 44, 0.15);
  --page-title-icon-border: #e55a2c;
  --page-title-icon-color: #e55a2c;
  
  /* Couleurs du texte */
  --page-title-text-color: #ffffff;
  --page-title-subtitle-color: rgba(255, 255, 255, 0.7);
  
  /* Couleurs des statistiques */
  --page-title-stats-color: #e55a2c;
  --page-title-stats-label-color: rgba(255, 255, 255, 0.6);
}
```

### **Classes de Variantes**

```css
/* Variante avec accent coloré */
.page-title-container-glass.accent {
  --page-title-icon-bg: rgba(59, 130, 246, 0.15);
  --page-title-icon-border: #3b82f6;
  --page-title-icon-color: #3b82f6;
}

/* Variante avec fond sombre */
.page-title-container-glass.dark {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}
```

## 🔧 IMPLÉMENTATION TECHNIQUE

### **Fichier CSS Principal**
- **Localisation** : `src/styles/page-title-containers.css`
- **Import** : Automatique dans `src/app/layout.tsx`
- **Disponibilité** : Globale sur toutes les pages

### **Structure des Classes**
```
page-title-container-glass     # Container principal
├── page-title-content        # Layout interne
├── page-title-icon-container # Container de l'icône
├── page-title-section        # Titre + sous-titre
└── page-title-stats          # Statistiques
    └── page-title-stats-item # Item individuel
```

### **Compatibilité**
- ✅ **Next.js 13+** App Router
- ✅ **Framer Motion** pour les animations
- ✅ **CSS Modules** et **CSS-in-JS**
- ✅ **Tailwind CSS** (classes utilitaires)
- ✅ **Responsive** automatique

## 📋 PAGES MIGRÉES

### ✅ **Page Dossiers** (`/private/dossiers`)
- **Avant** : `.dossiers-page-title-glass`
- **Après** : `.page-title-container-glass`
- **Statistiques** : Nombre de classeurs et notes

### ✅ **Page Fichiers** (`/private/files`)
- **Avant** : `.files-header-glass`
- **Après** : `.page-title-container-glass`
- **Statistiques** : Nombre de fichiers et quota

### ✅ **Page Corbeille** (`/private/trash`)
- **Avant** : `.trash-page-title-glass`
- **Après** : `.page-title-container-glass`
- **Statistiques** : Éléments, notes, dossiers

### ✅ **Page Accueil** (`/`)
- **Avant** : `.home-header-glass`
- **Après** : `.page-title-container-glass`
- **Statistiques** : Classeurs, notes, récents

## 🎯 AVANTAGES

### **Cohérence Visuelle**
- ✅ **Même hauteur** sur toutes les pages
- ✅ **Même espacement** entre les éléments
- ✅ **Même style** glassmorphism
- ✅ **Même animations** et transitions

### **Maintenance Simplifiée**
- ✅ **Un seul fichier CSS** à maintenir
- ✅ **Classes standardisées** partout
- ✅ **Responsive automatique** intégré
- ✅ **Composant réutilisable** disponible

### **Performance Optimisée**
- ✅ **CSS partagé** entre toutes les pages
- ✅ **Pas de duplication** de styles
- ✅ **Cache navigateur** optimisé
- ✅ **Bundle size** réduit

## 🚀 PROCHAINES ÉTAPES

### **1. Migration des Pages Restantes**
- [ ] Page des agents (`/agents`)
- [ ] Page des paramètres (`/private/account`)
- [ ] Pages de test et démo

### **2. Composants Avancés**
- [ ] Variantes de couleurs
- [ ] Animations personnalisées
- [ ] Thèmes dynamiques

### **3. Documentation Interactive**
- [ ] Storybook pour les composants
- [ ] Exemples de code
- [ ] Guide de migration

---

**🎉 Résultat : Tous les containers de titre ont maintenant la même hauteur, les mêmes proportions et le même style glassmorphism !** 