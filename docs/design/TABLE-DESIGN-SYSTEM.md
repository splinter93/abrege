# 🎨 Design System - Tableaux

## Objectif
Créer des tableaux modernes, élégants et lisibles qui s'intègrent parfaitement dans l'écosystème Scrivia.

## Principes de Design

### 1. **Hiérarchie Visuelle Claire**
- **Headers** avec fond contrasté (`var(--surface-secondary)`)
- **Text-transform: uppercase** + taille réduite (0.75rem) pour différencier
- **Letter-spacing: 0.08em** pour améliorer la lisibilité en majuscules
- **Border-bottom 2px** pour séparer clairement header et contenu

### 2. **Espacement Généreux**
- **Padding: 12px 16px** (au lieu de 8px 20px)
- Plus de hauteur, moins de largeur = meilleure respiration verticale
- Cellules aérées pour une lecture confortable

### 3. **Bordures Internes**
- **Border-right** entre les colonnes pour délimiter clairement les données
- **Border-bottom** entre les lignes pour la structure
- Dernière colonne sans border-right pour éviter la redondance avec le wrapper

### 4. **Profondeur et Élévation**
- **Box-shadow**: `0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)`
- Effet de "carte" qui sort légèrement de la page
- Impression de qualité premium

### 5. **Zebra Striping Subtil**
- Lignes impaires: `var(--color-bg-content)`
- Lignes paires: `var(--surface-tertiary)`
- Contraste très léger pour guider l'œil sans distraire

### 6. **Hover Effect Visible**
- Background: `var(--surface-hover) !important`
- Transition: `0.15s ease`
- Cursor: `pointer` pour suggérer l'interactivité
- Important flag pour override zebra striping

### 7. **Première Colonne Accentuée**
- **Font-weight: 600** (semi-bold)
- **Color: var(--color-text-primary)** (plus foncé)
- Traitement comme "label" ou "clé" de la ligne
- Améliore la scanabilité du tableau

### 8. **Border-radius Parfait**
- Wrapper: `var(--radius-md)`
- Coins internes: `calc(var(--radius-md) - 1px)` pour compenser la bordure
- Tous les coins (header + footer) correctement arrondis

## Comparaison Avant/Après

### Avant ❌
- Headers peu différenciés du contenu
- Espacement étroit (8px padding)
- Pas de bordures internes
- Shadow très légère
- Hover peu visible
- Première colonne pas mise en valeur

### Après ✅
- Headers clairement identifiables (uppercase, fond grisé)
- Espacement confortable (12px padding)
- Bordures internes pour structure
- Shadow prononcée (effet carte)
- Hover visible et réactif
- Première colonne en semi-bold

## Inspirations
- **GitHub** : Headers uppercase, bordures internes
- **Notion** : Shadow subtile, hover visible
- **Linear** : Première colonne accentuée, spacing généreux
- **Stripe Docs** : Typography claire, hiérarchie forte

## Variables CSS Utilisées
```css
--surface-secondary       /* Background du header */
--border-default          /* Bordure principale */
--border-subtle           /* Bordures internes */
--color-text-primary      /* Texte principal (headers, 1ère colonne) */
--color-text-secondary    /* Texte des cellules */
--surface-tertiary        /* Zebra striping */
--surface-hover           /* Hover effect */
--radius-md               /* Border-radius */
```

## Résultat Final
Un tableau **moderne**, **élégant** et **professionnel** qui s'intègre parfaitement avec les blocs de code, blockquotes et autres éléments de contenu.

---

*Design finalisé le 18 octobre 2025*

