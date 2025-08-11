# 🎨 ARCHITECTURE CSS - PAGE DOSSIERS

## 📁 **STRUCTURE FINALE PROPRE**

```
src/app/private/dossiers/
├── index.css (point d'entrée - imports centralisés)
├── DossiersPage.css (layout principal)
└── CSS-ARCHITECTURE.md (ce guide)

src/components/
├── ClasseurTabs.css (onglets de classeurs)
├── PrivateSidebar.css (sidebar privée)
├── FolderManagerModern.css (gestionnaire de dossiers)
├── FolderContent.css (contenu des dossiers)
└── FolderGridItems.css (éléments de grille)
```

## 🎯 **HIÉRARCHIE DES IMPORTS CSS**

L'ordre des imports est **CRUCIAL** pour éviter les conflits :

```css
/* 1. Variables et design system (priorité la plus basse) */
@import '../../../styles/design-system.css';

/* 2. Layout principal de la page */
@import './DossiersPage.css';

/* 3. Composants de navigation */
@import '../../../components/ClasseurTabs.css';
@import '../../../components/PrivateSidebar.css';

/* 4. Gestionnaire de dossiers et contenu */
@import '../../../components/FolderManagerModern.css';
@import '../../../components/FolderContent.css';
@import '../../../components/FolderGridItems.css';

/* 5. Composants utilitaires */
@import '../../../components/Toast.css';
@import '../../../components/Tooltip.css';
```

## 🔒 **CONVENTIONS DE NOMMAGE**

### **Préfixes par Composant**
- **`.dossiers-*`** : Page dossiers uniquement
- **`.classeur-*`** : Composant ClasseurTabs uniquement
- **`.private-*`** : Composant PrivateSidebar uniquement
- **`.folder-*`** : Composants de gestion des dossiers
- **`.fm-*`** : Classes spécifiques FolderManager

### **Exemples de Classes**
```css
/* ✅ BON - Préfixe clair */
.dossiers-page-wrapper
.classeur-tabs-wrapper
.private-sidebar-nav
.folder-manager-content

/* ❌ MAUVAIS - Pas de préfixe */
.sidebar-nav (conflit potentiel)
.tabs-wrapper (trop générique)
```

## 🚫 **RÈGLES STRICTES**

### **1. Pas de Styles Inline**
```tsx
// ❌ INTERDIT
<div style={{ backgroundColor: 'red', padding: '20px' }}>

// ✅ OBLIGATOIRE
<div className="my-component">
```

### **2. Pas de Classes Globales**
```css
/* ❌ INTERDIT - Trop générique */
.sidebar { }
.nav { }
.button { }

/* ✅ OBLIGATOIRE - Préfixe requis */
.private-sidebar { }
.classeur-nav { }
.folder-button { }
```

### **3. Pas de !important**
```css
/* ❌ INTERDIT */
.my-class { color: red !important; }

/* ✅ OBLIGATOIRE - Utiliser la spécificité CSS */
.parent .my-class { color: red; }
```

## 🎨 **VARIABLES CSS OBLIGATOIRES**

Toutes les couleurs, espacements et typographies doivent utiliser les variables du design system :

```css
/* ✅ BON - Variables centralisées */
background-color: var(--surface-1);
color: var(--text-1);
padding: var(--spacing-lg);
border: 1px solid var(--border);

/* ❌ MAUVAIS - Valeurs codées en dur */
background-color: #202124;
color: #ffffff;
padding: 24px;
border: 1px solid #3a3a3c;
```

## 📱 **RESPONSIVE DESIGN**

Chaque composant doit avoir ses propres media queries :

```css
/* Responsive pour ClasseurTabs */
@media (max-width: 768px) {
  .classeur-tabs-wrapper { padding: 1rem; }
  .classeur-tab { min-width: 100px; }
}

/* Responsive pour PrivateSidebar */
@media (max-width: 768px) {
  .private-sidebar { position: relative; }
}
```

## 🔍 **DÉBOGAGE ET MAINTENANCE**

### **Vérification des Conflits**
```bash
# Rechercher les classes dupliquées
grep -r "\.sidebar" src/components/*.css
grep -r "\.folder" src/components/*.css
```

### **Ordre des Imports**
Toujours vérifier que l'ordre des imports respecte la hiérarchie :
1. Design system (variables)
2. Layout principal
3. Composants de navigation
4. Composants de contenu
5. Utilitaires

## ✅ **CHECKLIST DE VALIDATION**

Avant de commiter des changements CSS :

- [ ] Tous les styles inline ont été extraits vers des classes CSS
- [ ] Toutes les classes ont un préfixe unique
- [ ] Toutes les couleurs utilisent des variables CSS
- [ ] Les media queries sont présentes pour le responsive
- [ ] L'ordre des imports CSS est respecté
- [ ] Aucun `!important` n'est utilisé
- [ ] Les classes globales ont été évitées

## 🚀 **AVANTAGES DE CETTE ARCHITECTURE**

1. **Zéro conflit CSS** entre composants
2. **Maintenance facile** - un fichier = un composant
3. **Performance optimale** - pas de CSS mort
4. **Responsive cohérent** - règles unifiées
5. **Évolutivité** - facile d'ajouter de nouveaux composants
6. **Debugging simple** - problèmes isolés par composant

---

**Dernière mise à jour :** $(date)
**Architecte CSS :** Assistant IA
**Statut :** ✅ ARCHITECTURE PROPRE ET VALIDÉE 