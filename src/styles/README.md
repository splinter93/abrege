# Styles Markdown Unifiés (`markdown.css`)

## 📄 Objectif
Ce fichier centralise **tous les styles custom pour le rendu Markdown** (titres, tableaux, blockquotes, listes, code, images, etc.) afin d’assurer une cohérence visuelle parfaite dans l’éditeur, les previews, les pages de résumé, etc.

## 🏷️ Classe racine
Tous les styles sont portés par la classe racine :

```html
<div class="markdown-body">
  <!-- contenu markdown -->
</div>
```

Ajoute simplement `markdown-body` sur tout container qui affiche du markdown (éditeur, preview, résumé…)

## 🚀 Utilisation
1. **Importer le CSS** dans le composant/page :
   ```js
   import '../styles/markdown.css';
   // ou '../../styles/markdown.css' selon la profondeur
   ```
2. **Ajouter la classe** sur le container :
   ```jsx
   <div className="markdown-body">{renderedMarkdown}</div>
   ```

## 🧩 Philosophie
- **Unification** : une seule source de vérité pour tous les styles markdown custom.
- **Maintenance** : toute évolution du design markdown se fait ici, et s’applique partout.
- **Simplicité** : plus de doublons, plus de conflits de cascade CSS.

## 🛠️ Couverture
- Titres (h1, h2, h3…)
- Paragraphes
- Listes (ul, ol, li)
- Liens
- Code (inline et blocs)
- Tableaux (table, th, td…)
- Blockquotes
- Images
- Séparateurs (hr)
- Sélection

## ✨ Astuce
Tu peux surcharger certains styles localement si besoin, mais garde la classe `markdown-body` comme base pour garantir la cohérence.

---

**Fichier principal :** `src/styles/markdown.css` 