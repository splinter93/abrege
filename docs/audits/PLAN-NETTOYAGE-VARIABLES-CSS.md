# 🧹 PLAN DE NETTOYAGE - VARIABLES CSS

**Date** : 12 octobre 2025  
**Objectif** : Fusionner 5 fichiers de variables en 2 fichiers propres  
**Temps estimé** : 1-2 heures

---

## 🎯 ÉTAT ACTUEL (BORDEL)

### 5 Fichiers de Variables qui se Marchent Dessus

```
1. variables.css (460 lignes)
   └─ Couleurs, backgrounds, textes, espacements

2. variables-unified.css (289 lignes)
   └─ Couleurs, backgrounds, textes (doublons)

3. variables-consolidated.css (328 lignes)
   └─ TOUT (écrase les autres) ❌ LE COUPABLE

4. design-system.css (350 lignes)
   └─ Couleurs, surfaces, espacements (doublons)

5. themes.css (259 lignes)
   └─ Thèmes light/dark (doublons)
```

**Problème** : En build, `variables-consolidated.css` se charge EN DERNIER et **écrase tout** !

---

## ✅ ÉTAT CIBLE (PROPRE)

### 2 Fichiers Unifiés

```
1. variables.css (~300 lignes)
   ├─ Couleurs (backgrounds, textes, accents)
   ├─ Mode :root (sombre par défaut)
   └─ Mode .theme-light (override si nécessaire)

2. design-system.css (~200 lignes)
   ├─ Espacements (spacing, padding, margin)
   ├─ Rayons (border-radius)
   ├─ Ombres (box-shadow)
   ├─ Transitions (timing)
   ├─ Z-index (hiérarchie)
   └─ Classes utilitaires (.app-layout, etc.)
```

**Avantages** :
- ✅ Séparation claire : couleurs vs système
- ✅ Plus de conflits
- ✅ Ordre de chargement clair
- ✅ Maintenable et scalable

---

## 📋 PLAN D'ACTION

### Phase 1 : Analyse (15 min)

- [x] Lister toutes les variables de chaque fichier
- [ ] Identifier les doublons
- [ ] Déterminer quoi garder où

### Phase 2 : Fusion dans variables.css (30 min)

- [ ] Créer backup de variables.css
- [ ] Fusionner couleurs de tous les fichiers
- [ ] Ajouter :root avec valeurs sombres par défaut
- [ ] Ajouter .theme-light pour override
- [ ] Supprimer doublons

### Phase 3 : Nettoyer design-system.css (20 min)

- [ ] Garder uniquement espacements, rayons, ombres
- [ ] Supprimer les couleurs (déjà dans variables.css)
- [ ] Garder les classes utilitaires (.app-layout, etc.)

### Phase 4 : Mettre à jour imports (15 min)

- [ ] layout.tsx : supprimer imports obsolètes
- [ ] Garder uniquement variables.css + design-system.css
- [ ] Vérifier ordre de chargement

### Phase 5 : Supprimer fichiers obsolètes (10 min)

- [ ] Supprimer variables-unified.css
- [ ] Supprimer variables-consolidated.css
- [ ] Supprimer themes.css
- [ ] Mettre à jour editor-bundle.css si nécessaire

### Phase 6 : Tests (20 min)

- [ ] Build local
- [ ] Tester éditeur
- [ ] Tester page publique
- [ ] Tester responsive
- [ ] Vérifier pas de régression

---

## 🔍 ANALYSE DÉTAILLÉE

### Variables à Garder dans variables.css

#### Couleurs Backgrounds
```css
--color-bg-primary: #121212
--color-bg-secondary: #171717
--color-bg-tertiary: #1c1c1c
--color-bg-elevated: #2C2C2C
--color-bg-content: #202020
--color-bg-hover: rgba(255, 255, 255, 0.05)
```

#### Couleurs Textes
```css
--color-text-primary: #d0d0d0
--color-text-secondary: #A0A0A0
--color-text-muted: #6A6A6A
--text-primary: #d0d0d0
--text-secondary: #a3a3a3
--text-tertiary: #737373
```

#### Couleurs Accents
```css
--color-accent: #e55a2b
--color-accent-primary: #e55a2b
--color-accent-hover: #f5652c
--accent-primary: #e55a2b
```

#### Surfaces
```css
--surface-primary: #171717
--surface-secondary: #1c1c1c
--surface-tertiary: #212121
--surface-background: #121212
--surface-hover: #212121
```

#### Bordures
```css
--border-subtle: #2a2a2c
--border-medium: #3a3a3c
--border-strong: #4a4a4c
```

---

### Variables à Garder dans design-system.css

#### Espacements
```css
--spacing-xs: 0.25rem
--spacing-sm: 0.5rem
--spacing-md: 1rem
--spacing-lg: 1.5rem
--spacing-xl: 2rem
```

#### Rayons
```css
--radius-xs: 4px
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

#### Ombres
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2)
```

#### Transitions
```css
--transition-fast: 0.15s ease
--transition-normal: 0.2s ease
--transition-slow: 0.3s ease
```

#### Z-Index
```css
--z-dropdown: 1000
--z-sidebar: 1001
--z-modal: 1002
```

#### Classes Utilitaires
```css
.app-layout { ... }
.app-main-content { ... }
```

---

## 📁 FICHIERS À SUPPRIMER

1. ✅ `variables-unified.css` (doublons)
2. ✅ `variables-consolidated.css` (écrasait tout)
3. ✅ `themes.css` (fusionné dans variables.css)

---

## 🎓 STRUCTURE FINALE

```
src/styles/
├── variables.css (COULEURS UNIQUEMENT)
│   ├── :root (sombre par défaut)
│   ├── .theme-light (override)
│   └── Alias pour compatibilité
│
├── design-system.css (SYSTÈME UNIQUEMENT)
│   ├── Espacements
│   ├── Rayons
│   ├── Ombres
│   ├── Transitions
│   ├── Z-index
│   └── Classes utilitaires
│
└── (autres CSS spécifiques inchangés)
```

---

**Prêt à commencer ?** 🚀

Je commence par **Phase 1** maintenant si tu confirmes !



