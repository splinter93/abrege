# TEST PADDING IMAGES - DÉBOGAGE

## 🎯 Objectif

Vérifier que les paddings des images sont identiques dans tous les modes.

## 📋 Valeurs attendues

### Variables CSS définies dans `src/styles/variables.css`

```css
--md-img-margin-top: 1rem;       /* 16px - DÉFAUT (lecture/chat) */
--md-img-margin-bottom: 0.25rem; /* 4px - UNIFORME partout */
--md-img-margin-top-edit: 0.25rem; /* 4px - override édition */
```

### Résultat attendu dans le navigateur (computed styles)

| Mode | Sélecteur CSS | margin-top | margin-bottom |
|------|--------------|------------|---------------|
| **Édition** | `.ProseMirror img` | **4px** | **4px** |
| **Lecture** | `.markdown-body img` | **16px** | **4px** |
| **Chat** | `.chat-markdown img` | **16px** | **4px** |

## 🔍 Comment tester

### 1. Mode Édition
1. Ouvrir une note en mode édition
2. Insérer une image
3. Inspecter l'élément `<img>` dans DevTools
4. Vérifier `computed` → `margin-top` = **4px**
5. Vérifier `computed` → `margin-bottom` = **4px**

### 2. Mode Lecture/Preview
1. Basculer en mode lecture (toggle preview)
2. Inspecter l'élément `<img>` dans DevTools
3. Vérifier `computed` → `margin-top` = **16px**
4. Vérifier `computed` → `margin-bottom` = **4px**

### 3. Chat
1. Ouvrir le chat
2. Envoyer une image ou demander à l'agent de générer du markdown avec image
3. Inspecter l'élément `<img>` dans DevTools
4. Vérifier `computed` → `margin-top` = **16px**
5. Vérifier `computed` → `margin-bottom` = **4px**

## 🐛 Si les valeurs sont différentes

### Étape 1 : Vérifier les classes CSS appliquées

Dans DevTools, regarder :
- L'élément `<img>` a-t-il les bonnes classes parentes ?
  - Mode édition : doit être dans `.ProseMirror`
  - Mode lecture : doit être dans `.markdown-body`
  - Chat : doit être dans `.chat-markdown`

### Étape 2 : Vérifier les règles appliquées

Dans DevTools → Styles :
- Regarder quelle règle CSS est appliquée
- S'il y a une règle qui écrase (`strikethrough`), noter laquelle
- Reporter le sélecteur exact ici

### Étape 3 : Vérifier l'ordre de chargement

Dans DevTools → Network :
- Vérifier l'ordre de chargement des CSS
- `variables.css` doit venir EN PREMIER
- `editor-markdown.css` doit venir APRÈS `typography.css`

## 📝 Reporter les résultats

### Mode Édition
- [ ] margin-top computed: ___px
- [ ] margin-bottom computed: ___px
- [ ] Classe parente: ___
- [ ] Règle CSS appliquée: ___

### Mode Lecture
- [ ] margin-top computed: ___px
- [ ] margin-bottom computed: ___px
- [ ] Classe parente: ___
- [ ] Règle CSS appliquée: ___

### Chat
- [ ] margin-top computed: ___px
- [ ] margin-bottom computed: ___px
- [ ] Classe parente: ___
- [ ] Règle CSS appliquée: ___

---

**Si les 3 valeurs sont différentes**, reporter les sélecteurs exacts des règles qui s'appliquent.

## 🔧 Corrections possibles

### Si margin-top en édition > 4px

Vérifier dans DevTools quelle règle écrase `.ProseMirror img { margin-top: var(--md-img-margin-top-edit); }`

Possibilités :
- Une règle plus spécifique (ex: `.editor-content .ProseMirror img`)
- Une règle avec `!important`
- Une règle qui vient après dans l'ordre de chargement

### Si margin-top en lecture/chat ≠ 16px

Vérifier dans DevTools quelle règle écrase `.markdown-body img` ou `.chat-markdown img`

Possibilités :
- Une règle plus spécifique
- Une règle dans `typography.css` que je n'ai pas supprimée
- Un autre fichier CSS qui override

---

**Date :** 2025-11-02  
**Status :** En attente des résultats du test navigateur

