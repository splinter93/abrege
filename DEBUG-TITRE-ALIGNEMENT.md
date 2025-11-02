# DEBUG - TITRE PAS ALIGNÉ

## 🔍 BESOIN D'INFO

Le titre n'est plus aligné avec le contenu de l'éditeur.

**Questions pour débugger :**

1. **C'est décalé de combien ?**
   - Quelques pixels ?
   - Beaucoup (genre 20-50px) ?
   - À gauche ou à droite ?

2. **C'est dans quel mode ?**
   - Mode normal (sans image) ?
   - Mode avec image header ?
   - Mode wide ?

3. **DevTools inspection :**
   - Ouvre DevTools sur le textarea du titre
   - Regarde dans "Computed" :
     - `padding-left` = ?
     - `padding-right` = ?
     - `margin-left` = ?
     - `margin-right` = ?
   - Ouvre DevTools sur le `.ProseMirror` (contenu)
   - Regarde dans "Computed" :
     - `padding-left` = ?
     - `padding-right` = ?
     - `margin-left` = ?
     - `margin-right` = ?

## 🎯 VALEURS ATTENDUES

### Titre (`.noteLayout-title textarea`)
```
padding: 0 0 12px 0  (top, right, bottom, left)
         ↑  ↑       ↑
         0  0       0  ← Pas de padding horizontal
margin: 0
```

### Contenu (`.noteLayout-content .editor-content`)
```
padding: 2px 0 72px 0  (ligne 408 typography.css)
         ↑   ↑      ↑
         2px 0      0  ← Pas de padding horizontal
```

Ou :
```
padding: 6px 0 100px 0  (var(--editor-content-padding))
```

**Normalement les deux ont 0 padding horizontal, donc alignés.**

## 🔧 CE QUE J'AI SUPPRIMÉ

J'ai supprimé des règles H1-H6 dans typography.css qui avaient peut-être un padding/margin qui compensait quelque chose ?

**Règles supprimées :**
- H1-H6 avec `margin: var(--editor-heading-margin-top) 0 ...`
- Paragraphes avec `margin: 0 0 var(--editor-paragraph-margin-bottom)`

Mais aucune de ces règles n'avait de padding horizontal normalement.

## 💡 HYPOTHÈSES

1. **Container parent** : Le titre et le contenu n'ont plus le même container width ?
2. **Padding ProseMirror** : Le `.ProseMirror` a un padding que le titre n'a pas ?
3. **Wrapper** : Un wrapper autour du contenu ajoute un padding ?

---

**Envoie-moi les valeurs DevTools et je fix.**

