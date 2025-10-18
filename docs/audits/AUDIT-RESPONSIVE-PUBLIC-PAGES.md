# 🔍 Audit Responsive - Pages Publiques

## État Actuel

### Breakpoints Existants
```css
@media (max-width: 768px)  /* Tablette/Mobile */
@media (max-width: 480px)  /* Petit mobile */
@media (max-width: 360px)  /* Très petit mobile */
@media (max-width: 768px) and (orientation: landscape) /* Paysage */
```

### Problèmes Identifiés

#### 1. **Largeur Fixe du Contenu**
- `--editor-content-width-normal: 800px` (fixe)
- `--editor-content-width-wide: 1000px` (fixe)
- ❌ **Problème** : Débordement sur petits écrans
- ❌ **Problème** : Padding horizontal insuffisant sur mobile

#### 2. **Images Header**
- ✅ Hauteur responsive (200px → 150px → 120px)
- ❌ Pas de padding horizontal sur mobile
- ❌ Peut déborder sur petits écrans

#### 3. **Tableaux**
- ❌ `table-layout: fixed` peut casser sur mobile
- ❌ Pas de scroll horizontal sur débordement
- ❌ Padding des cellules trop large pour mobile

#### 4. **Blocs de Code**
- ❌ Risque de débordement horizontal
- ❌ Font-size fixe, pas d'ajustement mobile
- ❌ Toolbar peut être trop large

#### 5. **TOC (Table of Contents)**
- ❌ Position sticky peut gêner sur tablette
- ❌ Pas de comportement adaptatif (collapse sur mobile)

#### 6. **Bouton "Modifier"**
- ✅ Texte caché sur mobile
- ✅ Taille réduite
- ⚠️ Position fixe peut bloquer du contenu

## Solution Proposée

### 1. **Largeur Adaptative du Contenu**
```css
/* Desktop */
--editor-content-width-normal: min(800px, calc(100vw - 48px));
--editor-content-width-wide: min(1000px, calc(100vw - 48px));

/* Tablette */
@media (max-width: 1024px) {
  --editor-content-width-normal: calc(100vw - 40px);
  --editor-content-width-wide: calc(100vw - 40px);
}

/* Mobile */
@media (max-width: 768px) {
  --editor-content-width-normal: calc(100vw - 32px);
  --editor-content-width-wide: calc(100vw - 32px);
}

/* Petit mobile */
@media (max-width: 480px) {
  --editor-content-width-normal: calc(100vw - 24px);
  --editor-content-width-wide: calc(100vw - 24px);
}
```

### 2. **Padding Horizontal Sécurisé**
```css
.editor-container-width {
  padding-left: 24px;
  padding-right: 24px;
}

@media (max-width: 768px) {
  .editor-container-width {
    padding-left: 16px;
    padding-right: 16px;
  }
}

@media (max-width: 480px) {
  .editor-container-width {
    padding-left: 12px;
    padding-right: 12px;
  }
}
```

### 3. **Tableaux Responsive**
```css
/* Wrapper avec scroll horizontal */
.tableWrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .tableWrapper {
    margin: 1.5rem -16px; /* Déborde légèrement */
  }
  
  table th,
  table td {
    padding: 8px 12px; /* Réduit le padding */
    font-size: 0.875rem; /* Plus petit */
  }
  
  table th {
    font-size: 0.7rem; /* Headers encore plus petits */
  }
}
```

### 4. **Blocs de Code Responsive**
```css
.u-block {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .u-block pre code {
    font-size: 0.75rem; /* Réduit la taille */
  }
  
  .u-block__toolbar {
    padding: 6px 12px; /* Réduit le padding */
    font-size: 0.7rem;
  }
  
  .toolbar-btn {
    padding: 4px 8px; /* Boutons plus petits */
  }
}
```

### 5. **TOC Responsive**
```css
.public-toc-container {
  display: block;
}

@media (max-width: 1024px) {
  .public-toc-container {
    display: none; /* Caché sur tablette */
  }
}

/* Alternative : TOC mobile en bas de page */
@media (max-width: 1024px) {
  .public-toc-container {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    max-width: 100%;
    margin-top: 48px;
    border-top: 1px solid var(--border-subtle);
    padding-top: 24px;
  }
}
```

### 6. **Images Pleine Largeur**
```css
.public-note-container .markdown-body img {
  width: 100%;
  max-width: 100%;
}

@media (max-width: 768px) {
  .public-header-image {
    margin-left: -16px;
    margin-right: -16px;
    width: calc(100% + 32px); /* Déborde du padding */
    border-radius: 0; /* Pas de radius sur mobile */
  }
}
```

### 7. **Typography Responsive**
```css
@media (max-width: 768px) {
  :root {
    --editor-title-size: 1.75rem; /* 28px au lieu de 32px */
    --editor-body-size: 0.9375rem; /* 15px au lieu de 16px */
    --editor-h1-size: 1.5rem; /* Réduit */
    --editor-h2-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  :root {
    --editor-title-size: 1.5rem; /* 24px */
    --editor-body-size: 0.875rem; /* 14px */
  }
}
```

## Ordre d'Implémentation

1. ✅ **Largeur adaptative** (priorité max)
2. ✅ **Padding horizontal sécurisé**
3. ✅ **Images pleine largeur**
4. ✅ **Tableaux responsive**
5. ✅ **Blocs de code responsive**
6. ⏳ **TOC adaptative** (optionnel)
7. ⏳ **Typography responsive** (fine-tuning)

## Tests Nécessaires

- [ ] iPhone SE (375px)
- [ ] iPhone 12/13 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] iPad (768px)
- [ ] iPad Pro (1024px)
- [ ] Desktop (1440px+)
- [ ] Orientation paysage mobile

---

*Audit créé le 18 octobre 2025*

