# MARKDOWN SPACING UNIFIÉ

## 🎯 PROBLÈME RÉSOLU

**Avant :** 
- Valeurs en dur dans 3 fichiers différents (`editor-markdown.css`, `chat-markdown.css`, `typography.css`)
- Modifications à faire à 3 endroits
- Incohérences entre éditeur, chat et preview
- Dette technique infernale

**Après :**
- **UNE SEULE SOURCE DE VÉRITÉ** : `src/styles/variables.css`
- Variables CSS utilisées partout
- Modification en 1 seul endroit = appliqué partout

---

## 📍 SOURCE UNIQUE DE VÉRITÉ

**Fichier : `src/styles/variables.css`**  
**Ligne : 172-206**

```css
:root {
  /* Titres - top / bottom */
  --md-h1-margin-top: 1.125rem;    /* 18px */
  --md-h1-margin-bottom: 0.75rem;  /* 12px */
  --md-h2-margin-top: 1rem;        /* 16px */
  --md-h2-margin-bottom: 0.625rem; /* 10px */
  --md-h3-margin-top: 0.875rem;    /* 14px */
  --md-h3-margin-bottom: 0.5rem;   /* 8px */
  --md-h4-margin-top: 0.75rem;     /* 12px */
  --md-h4-margin-bottom: 0.375rem; /* 6px */
  --md-h5-margin-top: 0.625rem;    /* 10px */
  --md-h5-margin-bottom: 0.375rem; /* 6px */
  --md-h6-margin-top: 0.625rem;    /* 10px */
  --md-h6-margin-bottom: 0.25rem;  /* 4px */
  
  /* Contenu */
  --md-p-margin: 0.5rem;           /* 8px */
  --md-img-margin-top: 1rem;       /* 16px - DÉFAUT pour lecture/chat */
  --md-img-margin-bottom: 0.25rem; /* 4px - espacement APRÈS l'image */
  --md-img-margin-top-edit: 0.25rem; /* 4px - override édition */
  --md-list-margin: 0.5rem;        /* 8px */
  --md-list-item-margin: 0.25rem;  /* 4px */
  --md-list-nested-margin: 0.125rem; /* 2px */
  
  Note: Les images ont margin-bottom: 0 en CSS.
  L'espacement sous l'image est géré par img + p { margin-top: 4px }
  
  /* Blocs */
  --md-table-margin: 1rem;         /* 16px */
  --md-blockquote-margin: 0.875rem; /* 14px */
  --md-blockquote-padding: 0.625rem; /* 10px */
  --md-hr-margin: 1.25rem;         /* 20px */
}
```

---

## 🔄 UTILISATION

Les variables sont automatiquement utilisées dans :

1. **Mode édition** : `.ProseMirror` dans `editor-markdown.css`
2. **Mode lecture/preview** : `.markdown-body` dans `editor-markdown.css`
3. **Chat** : `.chat-markdown` dans `chat-markdown.css`

### Exemple d'utilisation dans les CSS :

```css
/* AVANT (valeur en dur) */
.ProseMirror h1 {
  margin: 1.125rem 0 0.75rem 0;
}

/* APRÈS (variable) */
.ProseMirror h1 {
  margin: var(--md-h1-margin-top) 0 var(--md-h1-margin-bottom) 0;
}
```

---

## ✏️ COMMENT MODIFIER LES ESPACEMENTS

### 1. Ouvrir `src/styles/variables.css`
### 2. Trouver la section "MARKDOWN SPACING" (ligne 172)
### 3. Modifier la valeur souhaitée
### 4. Sauvegarder

**C'EST TOUT !** Le changement s'applique automatiquement :
- ✅ Mode édition
- ✅ Mode lecture/preview
- ✅ Chat

### Exemple 1 : Augmenter l'espace au-dessus des images (lecture/chat)

```css
/* Dans variables.css */
:root {
  --md-img-margin-top: 1.5rem; /* était 1rem, maintenant 1.5rem = 24px */
}
```

**Résultat :** Images en mode lecture/chat auront 24px de marge en haut. Mode édition reste à 4px.

### Exemple 2 : Changer le padding en mode édition

```css
/* Dans variables.css */
:root {
  --md-img-margin-top-edit: 0.5rem; /* était 0.25rem, maintenant 0.5rem = 8px */
}
```

**Résultat :** Images en mode édition auront 8px de marge en haut au lieu de 4px.

---

## 📊 VALEURS ACTUELLES (optimisées pour look compact)

| Élément | Top | Bottom | Équivalent px |
|---------|-----|--------|---------------|
| H1 | 1.125rem | 0.75rem | 18px / 12px |
| H2 | 1rem | 0.625rem | 16px / 10px |
| H3 | 0.875rem | 0.5rem | 14px / 8px |
| H4 | 0.75rem | 0.375rem | 12px / 6px |
| H5 | 0.625rem | 0.375rem | 10px / 6px |
| H6 | 0.625rem | 0.25rem | 10px / 4px |
| Paragraphes | - | 0.5rem | 8px |
| **Images (édition)** | **0.25rem** | **0.25rem** | **4px / 4px** ⚠️ |
| **Images (lecture/chat)** | **1rem** | **0.25rem** | **16px / 4px** ⚠️ |
| Listes | - | 0.5rem | 8px |
| Items de liste | - | 0.25rem | 4px |
| Listes imbriquées | - | 0.125rem | 2px |
| Tableaux | - | 1rem | 16px |
| Blockquotes | 0.875rem | 0.875rem | 14px |
| HR | - | 1.25rem | 20px |

---

## 🎨 UNIFICATION VISUELLE

### Code Blocks + Tableaux + Code Inline = STYLE UNIFIÉ

Tous les éléments de code utilisent maintenant **exactement les mêmes variables** :

```css
/* Variables unifiées (définies dans unified-blocks.css) */
background: var(--blk-bg);        /* Gradient défini par le thème */
color: var(--blk-fg);             /* Texte gris secondaire */
border-radius: var(--blk-radius); /* 14px */
filter: var(--code-brightness-filter, brightness(1.18));
```

**Appliqué sur :**
- ✅ **Code blocks** (`.u-block--code`)
- ✅ **Tableaux** (`table`)
- ✅ **Code inline** (`code:not(pre code)`)
- ✅ **Mermaid blocks** (`.u-block--mermaid`)

**Lignes tableaux ultra-fines :**
- Header (th) : `0.5px solid rgba(255, 255, 255, 0.04)`
- Body (td) : `0.5px solid rgba(255, 255, 255, 0.03)`

**Résultat :** Look cohérent, moderne et épuré partout.

---

## 📝 TYPOGRAPHIE CHAT

### Taille de police unifiée : 15.5px

Les messages du chat (user et assistant) utilisent une taille de police unifiée via **2 variables synchronisées** :

```css
/* chat-clean.css */
--chat-font-size-base: 15.5px;

/* chat-markdown.css */
--chat-text-base: 0.96875rem; /* 15.5px */
```

**Utilisé dans :**
- ✅ Bulles assistant (`.chatgpt-message-bubble`)
- ✅ Bulles user (`.chatgpt-message-bubble-user`)
- ✅ Paragraphes markdown (`.chat-markdown p`)
- ✅ Input textarea (`.chatgpt-input-textarea`)

**Pour modifier :** Changer les 2 variables (synchronisation manuelle requise).

---

## ⚠️ RÈGLES CRITIQUES

### ✅ À FAIRE
- Modifier les valeurs dans `variables.css` uniquement
- Utiliser les variables partout
- Garder la cohérence (1rem = 16px)

### ❌ NE JAMAIS FAIRE
- Modifier les valeurs en dur dans `editor-markdown.css` ou `chat-markdown.css` (sauf exceptions documentées)
- Créer de nouvelles valeurs sans passer par les variables
- ~~Utiliser des valeurs différentes entre les modes~~ *(Voir exceptions ci-dessous)*

### ⚠️ EXCEPTIONS DOCUMENTÉES

**Images : padding-top différent entre édition et lecture/chat**

Le mode **édition** garde un padding compact (4px) pour une expérience d'édition fluide, tandis que le mode **lecture** et le **chat** ont plus d'espace au-dessus (16px) pour une meilleure lisibilité.

```css
/* DÉFAUT pour TOUS les modes */
.ProseMirror img,
.markdown-body img,
.chat-markdown img {
  margin-top: var(--md-img-margin-top); /* 16px */
  margin-bottom: 0; /* Pas de margin en bas directement */
}

/* Override pour mode ÉDITION uniquement */
.ProseMirror img {
  margin-top: var(--md-img-margin-top-edit); /* 4px */
}

/* Espacement APRÈS l'image : géré par l'élément suivant */
.chat-markdown img + p,
.markdown-body img + p,
.ProseMirror img + p {
  margin-top: var(--md-img-margin-bottom); /* 4px seulement */
}
```

**Système de spacing après images :**
- L'image elle-même : `margin-bottom: 0`
- L'élément suivant (p, h1-h6) : `margin-top: 4px`
- **Avantage** : Contrôle précis, évite l'accumulation de margins

Cette exception est **intentionnelle** et répond à un besoin UX spécifique.

---

## 🎨 AVANTAGES

1. **Maintenance facile** : 1 endroit au lieu de 3
2. **Cohérence garantie** : Mêmes valeurs partout
3. **Rapidité** : Changement instantané dans toute l'app
4. **Lisibilité** : Variables auto-documentées avec commentaires
5. **Évolutivité** : Facile d'ajouter de nouvelles variables

---

## 📝 HISTORIQUE

- **2025-11-02** : Création du système unifié
- **Avant** : Dette technique avec 3 sources différentes
- **Problèmes résolus** :
  - ✅ Texte collé aux images
  - ✅ Incohérences entre modes
  - ✅ Double import de `typography.css` dans `layout.tsx` (causait override)
  - ✅ Règles redondantes de blockquote/hr dans `typography.css` (causaient conflits)

---

## 🔗 FICHIERS CONCERNÉS

1. **Source unique** : `src/styles/variables.css` (lignes 172-206)
2. **Utilisateurs** :
   - `src/styles/editor-markdown.css` (édition + preview)
   - `src/styles/chat-markdown.css` (chat)
3. **Corrections appliquées** :
   - `src/app/layout.tsx` : Suppression double import `typography.css`
   - `src/styles/typography.css` : Suppression règles redondantes blockquote/hr

---

## 🐛 BUGS CORRIGÉS

### Problème : Mode édition avait padding plus grand que preview/chat

**Cause racine :**
1. `typography.css` était importé 2 fois (dans `layout.tsx` + `globals.css`)
2. `typography.css` contenait des règles pour blockquote/hr avec anciennes variables
3. Ces règles venaient APRÈS `editor-markdown.css` et écrasaient les nouvelles variables

**Solution :**
1. ✅ Supprimé import de `typography.css` dans `layout.tsx` (déjà dans `globals.css`)
2. ✅ Supprimé règles redondantes blockquote/hr dans `typography.css`
3. ✅ Toutes les règles markdown utilisent maintenant les variables `--md-*` de `variables.css`

**Résultat :** Paddings identiques partout (édition, preview, chat) ✅

### Problème : Paddings parasites en mode édition (paragraphes)

**Cause racine :**
1. Deux variables différentes pour les paragraphes :
   - `--editor-paragraph-margin-bottom: 1.25em` (20px) ← ancien système
   - `--md-p-margin: 0.5rem` (8px) ← nouveau système unifié
2. Règle `.editor-content p` dans `typography.css` utilisait l'ancienne variable
3. Règle mobile `.ProseMirror p` avec `margin: 1.25em` écrasait les variables unifiées

**Solution :**
1. ✅ Supprimé `.editor-content p` dans `typography.css` (ligne 489-493)
2. ✅ Supprimé règle mobile avec `margin: 1.25em` (ligne 522-529)
3. ✅ Supprimé toutes les règles H1, H2, H3 avec `--editor-heading-margin-*` (lignes 795-873)
4. ✅ Supprimé toutes les règles H4, H5, H6 avec marges en dur (lignes 839-900)
5. ✅ Seules les variables `--md-*` sont maintenant utilisées

**Résultat :** Paddings propres partout, plus de conflits ✅

### Problème : Code blocks et Mermaid disparus en mode édition

**Cause racine :**
1. `editor-bundle.css` chargeait `editor-markdown.css` EN DERNIER (après `unified-blocks.css`)
2. `unified-blocks.css` manquait les sélecteurs `.ProseMirror pre` (avait seulement `.markdown-body pre`)
3. Ordre inversé par rapport à `globals.css` causait conflit

**Solution :**
1. ✅ Inversé l'ordre dans `editor-bundle.css` : `editor-markdown.css` AVANT `unified-blocks.css`
2. ✅ Ajouté `.ProseMirror pre`, `.ProseMirror pre code`, `.ProseMirror .hljs` dans `unified-blocks.css`
3. ✅ Ordre cohérent avec `globals.css` maintenant

**Résultat :** Code blocks et Mermaid s'affichent correctement dans l'éditeur ✅

---

**Standard Scrivia :** Code pour 1M+ utilisateurs. Une seule source de vérité. Zéro dette technique critique.

