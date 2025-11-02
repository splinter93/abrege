# 🔍 AUDIT - MODE LECTURE : LISTES & CHECKBOXES

**Date :** 2 novembre 2025  
**Problème :** Bullets disparus + checkboxes décalées en mode lecture uniquement  
**Statut :** Mode édition ✅ | Chat ✅ | Mode lecture 🔴

---

## 🐛 PROBLÈMES DÉTECTÉS

### 1. **Bullets des listes à puces disparus** 🔴

**Symptôme :** En mode lecture, les listes à puces normales n'affichent pas les bullets (•)

**Cause identifiée :**

**Conflit CSS entre `typography.css` et `unified-markdown.css`**

#### Ordre d'import (`editor-bundle.css`) :
```css
12: @import './typography.css';         /* CHARGÉ EN PREMIER */
16: @import './unified-markdown.css';   /* CHARGÉ APRÈS */
```

#### `typography.css` (ligne 498-507) :
```css
.markdown-body ul {
  margin: var(--editor-list-margin-vertical) 0;
  padding-left: 1.3em;
  font-family: var(--editor-font-family-body);
  font-size: var(--editor-body-size);
  line-height: var(--editor-line-height-base);
  /* ❌ MANQUE : list-style-type: disc; */
}
```

#### `unified-markdown.css` (ligne 173-179) :
```css
.markdown-body ul:not(.contains-task-list):not(:has(> li > input[type="checkbox"])) {
  margin: 1rem 0;
  padding-left: 1.5rem;
  list-style-type: disc;  /* ✅ Défini ici */
}
```

**Problème :** 
- Le sélecteur de `unified-markdown.css` est plus spécifique grâce aux `:not()`
- MAIS les sélecteurs `:not(:has(...))` peuvent être fragiles
- Si le HTML généré ne matche pas exactement, les bullets disparaissent

**Exemple de HTML qui cause problème :**

```html
<!-- HTML généré par markdown-it -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

Si ce `<ul>` ne matche pas le sélecteur `:not(:has(> li > input[type="checkbox"]))` pour une raison quelconque, le style `list-style-type: disc` ne s'applique pas.

---

### 2. **Checkboxes décalées vers la droite** 🔴

**Symptôme :** En mode lecture, les checkboxes sont plus à droite qu'en mode édition/chat

**Cause identifiée :**

**Conflit CSS entre `typography.css` et `checkbox-simple-approach.css`**

#### `typography.css` (ligne 498-507) :
```css
.markdown-body ul {
  padding-left: 1.3em;  /* ← APPLIQUÉ AUX TASK LISTS AUSSI */
}
```

#### `checkbox-simple-approach.css` (ligne 10-17) :
```css
.markdown-body ul[data-type="taskList"] {
  margin: var(--editor-list-margin-vertical, 1.25rem) 0 !important;
  padding-left: 0 !important;  /* ← Devrait écraser à 0 */
  line-height: var(--editor-line-height-base, 1.75) !important;
}
```

**Problème :**
- `typography.css` met `padding-left: 1.3em` sur TOUS les `<ul>` (y compris task lists)
- `checkbox-simple-approach.css` essaie de le remettre à 0 avec `!important`
- MAIS le sélecteur `ul[data-type="taskList"]` ne matche que les UL générés par Tiptap
- En mode lecture, les UL générés par markdown-it n'ont PAS l'attribut `data-type="taskList"`

**HTML généré par markdown-it :**
```html
<!-- Mode édition (Tiptap) - ✅ Fonctionne -->
<ul data-type="taskList">
  <li data-type="taskItem">
    <input type="checkbox" />
    Tâche 1
  </li>
</ul>

<!-- Mode lecture (markdown-it) - 🔴 Ne matche pas -->
<ul class="contains-task-list">
  <li class="task-list-item">
    <input type="checkbox" />
    Tâche 1
  </li>
</ul>
```

**Différences critiques :**
- Tiptap : `data-type="taskList"` / `data-type="taskItem"`
- markdown-it : `class="contains-task-list"` / `class="task-list-item"`

---

## 🔍 ANALYSE DÉTAILLÉE

### Sélecteurs CSS qui devraient matcher en mode lecture :

#### Pour les listes normales (bullets) :
```css
/* unified-markdown.css - ligne 174 */
.markdown-body ul:not(.contains-task-list):not(:has(> li > input[type="checkbox"]))
```

**Condition pour matcher :**
- `<ul>` dans `.markdown-body` ✅
- PAS de classe `.contains-task-list` ✅
- PAS de `<li>` enfant direct avec `<input type="checkbox">` ✅

**Devrait fonctionner... mais ne fonctionne pas ?**

**Hypothèse :** Le sélecteur `:has()` peut ne pas être supporté par tous les navigateurs ou peut avoir un bug de spécificité.

---

#### Pour les checkboxes :
```css
/* checkbox-simple-approach.css - ligne 10 */
.markdown-body ul[data-type="taskList"]
```

**Condition pour matcher :**
- `<ul>` avec attribut `data-type="taskList"` 🔴 N'EXISTE PAS en mode lecture !

**Sélecteur correct pour mode lecture :**
```css
.markdown-body ul.contains-task-list
```

---

### Comparaison mode édition vs mode lecture :

| Élément | Mode édition (Tiptap) | Mode lecture (markdown-it) | Match CSS ? |
|---------|----------------------|---------------------------|-------------|
| **UL normal** | `<ul>` | `<ul>` | ✅ Devrait marcher |
| **UL task list** | `<ul data-type="taskList">` | `<ul class="contains-task-list">` | 🔴 Sélecteurs différents |
| **LI normal** | `<li>` | `<li>` | ✅ Devrait marcher |
| **LI checkbox** | `<li data-type="taskItem">` | `<li class="task-list-item">` | 🔴 Sélecteurs différents |
| **Checkbox** | `<input type="checkbox">` | `<input type="checkbox">` | ✅ Identique |

---

## 🛠️ SOLUTIONS

### 🔴 SOLUTION 1 : Ajouter sélecteurs mode lecture (RAPIDE - 30 min)

**Action :** Dupliquer tous les sélecteurs `[data-type="taskList"]` pour cibler aussi `.contains-task-list`

#### `checkbox-simple-approach.css` - AVANT :
```css
ul[data-type="taskList"],
.ProseMirror ul[data-type="taskList"],
.markdown-body ul[data-type="taskList"] {
  padding-left: 0 !important;
}
```

#### `checkbox-simple-approach.css` - APRÈS :
```css
ul[data-type="taskList"],
.ProseMirror ul[data-type="taskList"],
.markdown-body ul[data-type="taskList"],
.markdown-body ul.contains-task-list {  /* ← AJOUTÉ */
  padding-left: 0 !important;
}
```

**Même chose pour :**
- Tous les sélecteurs `li[data-type="taskItem"]` → ajouter `li.task-list-item`
- Tous les sélecteurs `li:has(> input[type="checkbox"])` → OK (déjà générique)

**Fichiers à modifier :**
- `src/styles/checkbox-simple-approach.css` (lignes 9-96)
- `src/styles/unified-markdown.css` (vérifier si nécessaire)

---

### 🟡 SOLUTION 2 : Forcer `list-style-type` dans `typography.css` (QUICK FIX - 10 min)

**Action :** Ajouter `list-style-type: disc` dans `typography.css`

#### `typography.css` - AVANT (ligne 498) :
```css
.markdown-body ul {
  margin: var(--editor-list-margin-vertical) 0;
  padding-left: 1.3em;
  /* ... */
}
```

#### `typography.css` - APRÈS :
```css
.markdown-body ul {
  margin: var(--editor-list-margin-vertical) 0;
  padding-left: 1.3em;
  list-style-type: disc;  /* ← AJOUTÉ */
  /* ... */
}
```

**Impact :** Garantit que TOUS les `<ul>` ont des bullets par défaut

**Problème potentiel :** Peut mettre des bullets sur les task lists si les autres sélecteurs ne les overrident pas

---

### 🟢 SOLUTION 3 : Nettoyer `typography.css` (PROPRE - 1h)

**Action :** Supprimer les styles de listes de `typography.css` car déjà gérés par `unified-markdown.css`

#### Supprimer de `typography.css` (lignes 495-540) :
```css
/* Styles pour les listes dans l'éditeur - Blog Premium */
.editor-content ul,
.editor-content ol,
.markdown-body ul,    /* ← À SUPPRIMER */
.markdown-body ol,    /* ← À SUPPRIMER */
.ProseMirror ul,
.ProseMirror ol {
  /* ... */
}
```

**Garder uniquement :**
```css
.editor-content ul,
.editor-content ol,
.ProseMirror ul,
.ProseMirror ol {
  /* Styles pour mode édition uniquement */
}
```

**Avantage :** Un seul endroit pour les styles de listes (unified-markdown.css)

**Risque :** Peut casser d'autres pages (à tester exhaustivement)

---

## 🎯 RECOMMANDATION

### **SOLUTION HYBRIDE (45 min) ⭐ RECOMMANDÉ**

Combiner Solution 1 + Solution 2 pour une fix rapide et sûre :

#### 1. Ajouter sélecteurs mode lecture (30 min)

**Fichier :** `src/styles/checkbox-simple-approach.css`

Remplacer TOUS les sélecteurs :
- `ul[data-type="taskList"]` → ajouter `ul.contains-task-list`
- `li[data-type="taskItem"]` → ajouter `li.task-list-item`

#### 2. Forcer `list-style-type: disc` (10 min)

**Fichier :** `src/styles/typography.css` (ligne 500)

```css
.markdown-body ul {
  list-style-type: disc;  /* ← AJOUTER */
}
```

#### 3. Override pour task lists (5 min)

**Fichier :** `src/styles/checkbox-simple-approach.css` (ligne 16)

```css
.markdown-body ul.contains-task-list {
  list-style-type: none !important;  /* ← AJOUTER pour enlever bullets des task lists */
}
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1 : Fix checkboxes (30 min)

```css
/* checkbox-simple-approach.css */

/* Ligne 10-13 : Ajouter .contains-task-list */
- [ ] ul[data-type="taskList"],
      .markdown-body ul[data-type="taskList"],
      .markdown-body ul.contains-task-list  /* ← NOUVEAU */

/* Ligne 50-64 : Ajouter .task-list-item */
- [ ] .markdown-body li:has(> input[type="checkbox"]),
      .markdown-body li.task-list-item  /* ← NOUVEAU */

/* Vérifier toutes les occurrences de data-type */
- [ ] Rechercher "data-type=\"taskList\"" → ajouter ".contains-task-list"
- [ ] Rechercher "data-type=\"taskItem\"" → ajouter ".task-list-item"
```

### Phase 2 : Fix bullets (15 min)

```css
/* typography.css - ligne 500 */
- [ ] Ajouter list-style-type: disc sur .markdown-body ul

/* checkbox-simple-approach.css - ligne 16 */
- [ ] Ajouter list-style-type: none sur .markdown-body ul.contains-task-list
```

### Phase 3 : Tests (30 min)

- [ ] Tester listes à puces simples (mode lecture)
- [ ] Tester listes numérotées (mode lecture)
- [ ] Tester checkboxes non cochées (mode lecture)
- [ ] Tester checkboxes cochées (mode lecture)
- [ ] Tester listes imbriquées (mode lecture)
- [ ] Vérifier mode édition encore OK
- [ ] Vérifier chat encore OK

---

## 🔬 DEBUG

### Vérifier dans le navigateur (DevTools) :

#### Listes normales :
```css
/* Doit voir */
.markdown-body ul {
  list-style-type: disc;
  padding-left: 1.3em;
}
```

#### Task lists :
```css
/* Doit voir */
.markdown-body ul.contains-task-list {
  list-style-type: none;
  padding-left: 0;
}
```

#### Checkboxes :
```css
/* Doit voir */
.markdown-body li.task-list-item {
  margin-left: 3px;
  padding-left: 0;
}
```

---

## 📊 IMPACT ESTIMATION

| Change | Risque | Temps | Gain |
|--------|--------|-------|------|
| **Solution 1 (sélecteurs)** | 🟡 Moyen | 30 min | ✅ Fix checkboxes |
| **Solution 2 (list-style)** | 🟢 Faible | 10 min | ✅ Fix bullets |
| **Solution 3 (nettoyage)** | 🔴 Élevé | 1h | ✅ Clean code |
| **Hybride (1+2)** | 🟡 Moyen | 45 min | ✅ Fix complet |

---

## 🏆 CONCLUSION

**Problème identifié :** Sélecteurs CSS ne matchent pas le HTML généré par markdown-it en mode lecture

**Cause racine :** 
1. Tiptap utilise `data-type="taskList"` / `data-type="taskItem"`
2. markdown-it utilise `class="contains-task-list"` / `class="task-list-item"`
3. Les sélecteurs CSS ne ciblent que Tiptap

**Solution recommandée :** Hybride (Ajouter sélecteurs + Forcer list-style-type)

**Temps estimé :** 45 min + 30 min tests = **1h15 total**

**Prêt à implémenter ?** ✅

