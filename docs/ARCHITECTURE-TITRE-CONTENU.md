# ARCHITECTURE TITRE + CONTENU ÉDITEUR

## 🎯 SYSTÈME DE WRAPPER

### Architecture (définie dans `EditorLayout.tsx`)

```
.editor-layout
└─ .editor-content-wrapper (full width)
   └─ .editor-content-inner ← WRAPPER PRINCIPAL
      ├─ .noteLayout-title
      │  └─ textarea (titre)
      └─ .noteLayout-content
         └─ .editor-content / .ProseMirror (contenu)
```

### Responsabilités

**`.editor-content-inner`** (défini dans `editor-responsive.css`)
- ✅ Gère `max-width` (800px normal, 1000px wide)
- ✅ Gère `padding horizontal` responsive (24px desktop → 20px mobile)
- ✅ Centré avec `margin: 0 auto`
- ✅ `box-sizing: border-box`

**Titre + Contenu**
- ✅ `width: 100%` (héritent de la largeur du parent)
- ✅ `padding vertical` uniquement (pas horizontal)
- ✅ Alignés automatiquement

---

## 📐 LARGEURS CALCULÉES

### Desktop (normal mode)
```
.editor-content-inner {
  max-width: 800px
  padding: 0 24px
  box-sizing: border-box
}

Largeur interne disponible = 800 - (24 + 24) = 752px

→ Titre: width: 100% = 752px ✅
→ Contenu: width: 100% = 752px ✅
```

### Desktop (wide mode)
```
.editor-content-inner {
  max-width: 1000px
  padding: 0 24px
}

Largeur interne = 1000 - 48 = 952px

→ Titre: 952px ✅
→ Contenu: 952px ✅
```

### Tablet (≤ 1024px)
```
padding: 0 28px (au lieu de 24px)
Largeur interne = 800 - 56 = 744px
```

### Mobile (≤ 768px)
```
padding: 0 24px
max-width: 100% (fluide)
Largeur interne = 100vw - 48px
```

### Mobile small (≤ 480px)
```
padding: 0 20px
Largeur interne = 100vw - 40px
```

---

## ⚠️ RÈGLES CRITIQUES

### ✅ À FAIRE
- Titre et contenu : `width: 100%` UNIQUEMENT
- Padding horizontal : UNIQUEMENT dans `.editor-content-inner`
- Padding vertical : OK dans titre/contenu

### ❌ NE JAMAIS FAIRE
- Ajouter `max-width` fixe sur titre/contenu (casse responsive)
- Ajouter `padding horizontal` sur titre/contenu (double padding)
- Ajouter `margin: auto` sur titre/contenu (conflit centrage)

---

## 🔧 FICHIERS CONCERNÉS

1. **`src/styles/editor-responsive.css`**
   - Définit `.editor-content-inner`
   - Gère responsive via media queries
   - ⚠️ SOURCE DE VÉRITÉ pour largeurs/padding

2. **`src/styles/typography.css`**
   - Titre : `width: 100%`, padding vertical seulement
   - Contenu : `width: 100%`, padding vertical seulement

3. **`src/components/editor/editor-content.css`**
   - `.editor-content` et `.ProseMirror` : `width: 100%`
   - Pas de padding horizontal

4. **`src/components/editor/editor-title.css`**
   - `.editor-title-wrapper` : `width: 100%`
   - Pas de max-width ni padding horizontal

---

## 🎯 PRINCIPE

**Un seul container gère la largeur et le responsive : `.editor-content-inner`**

Tout ce qui est dedans hérite avec `width: 100%`.

Simple. Propre. Fonctionne.

---

**Date :** 2025-11-02  
**Standard :** Code pour 1M+ users. Architecture claire.

