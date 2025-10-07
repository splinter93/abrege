# 🎯 EXPLICATION COMPLÈTE - SYSTÈME DE DRAG HANDLE

## 📋 **RÉSUMÉ**

Le système de drag handle que j'ai implémenté est **hybride** :
- ✅ **Affichage du handle** : Extension custom
- ✅ **Drag & drop** : ProseMirror natif (via `view.dragging`)
- ✅ **Calcul des ranges** : Package Tiptap `@tiptap/extension-node-range`

---

## 🏗️ **ARCHITECTURE COMPLÈTE**

### **1. Les Packages Utilisés**

#### **A. Packages Tiptap Installés**
```json
{
  "@tiptap/extension-drag-handle": "^3.5.0",           // ❌ Non utilisé (bugs d'affichage)
  "@tiptap/extension-drag-handle-react": "^3.5.0",    // ❌ Non utilisé (composant React)
  "@tiptap/extension-node-range": "^3.5.0"            // ✅ UTILISÉ (getSelectionRanges)
}
```

#### **B. Ce que j'ai créé**
```
src/extensions/
└── NotionDragHandleExtension.tsx   ← Notre extension custom (195 lignes)

src/styles/
└── notion-drag-handle.css          ← Styles du handle (132 lignes)
```

---

## 🔍 **COMMENT ÇA MARCHE - ÉTAPE PAR ÉTAPE**

### **ÉTAPE 1 : Affichage du Handle** 🎨

**Fichier :** `NotionDragHandleExtension.tsx`

```typescript
// Au premier mousemove, on crée le handle
if (!globalDragHandle) {
  globalDragHandle = createDragHandle();
  editorElement.appendChild(globalDragHandle);
}
```

**Ce que fait `createDragHandle()` :**
```typescript
const handle = document.createElement('div');
handle.className = 'notion-drag-handle';
handle.draggable = true; // ✅ Important !
handle.innerHTML = `
  <div class="notion-drag-handle-btn">
    <svg><!-- 6 points en grille --></svg>
  </div>
`;
```

**Résultat :** Un `<div>` avec l'icône ⋮⋮ ajouté au DOM.

---

### **ÉTAPE 2 : Positionnement du Handle** 📍

**Déclenchement :** À chaque `mousemove` dans l'éditeur

```typescript
// 1. Trouver la position de la souris dans le document
const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });

// 2. Résoudre cette position pour obtenir le noeud
const $pos = view.state.doc.resolve(pos.pos);
let node = $pos.nodeAfter;
let nodePos = pos.pos;

// 3. Si on est dans un noeud, remonter au bloc parent
if ($pos.depth > 0) {
  node = $pos.node();
  nodePos = $pos.before();
}

// 4. Trouver l'élément DOM correspondant
const domNode = view.nodeDOM(nodePos);

// 5. Remonter jusqu'à l'enfant direct de .ProseMirror
let targetElement = domNode;
while (targetElement.parentElement !== view.dom) {
  targetElement = targetElement.parentElement;
}

// 6. Calculer la position du handle par rapport à ce bloc
const rect = targetElement.getBoundingClientRect();
const editorRect = view.dom.getBoundingClientRect();

globalDragHandle.style.left = `${rect.left - editorRect.left - 40}px`;
globalDragHandle.style.top = `${rect.top - editorRect.top + 2}px`;
globalDragHandle.style.opacity = '1';
```

**Résultat :** Le handle suit ta souris et se positionne à gauche de chaque bloc !

---

### **ÉTAPE 3 : Calculer la Position de Début du Bloc** 🎯

**Problème qu'on a eu :** Si on stocke `nodePos`, ça peut être au milieu du bloc !

**Solution :**
```typescript
// Utiliser posAtDOM sur l'élément DOM de premier niveau
let blockStartPos = view.posAtDOM(targetElement, 0);

// Vérifier qu'on est bien au niveau 1
const $check = view.state.doc.resolve(blockStartPos);
if ($check.depth > 1) {
  blockStartPos = $check.before(1);
}

// Stocker dans le handle
globalDragHandle.setAttribute('data-node-pos', blockStartPos.toString());
```

**Résultat :** On a toujours la position **exacte du début** du bloc, pas au milieu !

---

### **ÉTAPE 4 : Démarrage du Drag** 🚀

**Déclenchement :** Quand tu cliques et drag le handle

```typescript
globalDragHandle.addEventListener('dragstart', (e: DragEvent) => {
  // 1. Récupérer la position stockée
  const posStr = globalDragHandle?.getAttribute('data-node-pos');
  const pos = parseInt(posStr);
  
  // 2. Résoudre le noeud à cette position
  const { doc } = currentView.state;
  const $pos = doc.resolve(pos);
  const node = $pos.nodeAfter;
  
  // 3. Créer les ranges avec getSelectionRanges (Tiptap)
  const from = pos;
  const to = pos + node.nodeSize;
  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  
  const ranges = getSelectionRanges($from, $to, 0);
  
  // 4. Créer la sélection et la slice
  const selection = NodeRangeSelection.create(doc, from, to);
  const slice = selection.content();
  
  // 5. ✨ MAGIE : Dire à ProseMirror qu'on drag
  currentView.dragging = { slice, move: true };
  
  // 6. Sélectionner le bloc visuellement
  const tr = currentView.state.tr.setSelection(selection);
  currentView.dispatch(tr);
  
  // 7. Créer l'image de drag (ghost)
  const wrapper = document.createElement('div');
  const cloned = domNode.cloneNode(true);
  wrapper.appendChild(cloned);
  e.dataTransfer.setDragImage(wrapper, 0, 0);
});
```

**La clé magique :**
```typescript
currentView.dragging = { slice, move: true };
```

**Ce que ça fait :**
- ✅ Dit à ProseMirror : "J'ai un slice à déplacer en mode move"
- ✅ ProseMirror va **automatiquement** gérer le drop
- ✅ Il va **supprimer** de l'ancienne position
- ✅ Il va **insérer** à la nouvelle position
- ✅ Il **préserve tout** (markdown, attributs, structure)

---

### **ÉTAPE 5 : Drop Automatique** 📍

**Géré par ProseMirror !** On ne fait **RIEN** !

ProseMirror écoute l'événement `drop` nativement et :
1. ✅ Détecte où tu drop
2. ✅ Récupère le `slice` depuis `view.dragging`
3. ✅ Supprime le bloc de l'ancienne position
4. ✅ Insère le slice à la nouvelle position
5. ✅ Met à jour le document **sans bugs** !

---

## 🧩 **LES COMPOSANTS**

### **1. Extension Custom : `NotionDragHandleExtension`**

**Rôle :** Afficher et positionner le handle

**Pourquoi custom et pas officielle ?**
- ❌ `@tiptap/extension-drag-handle` ne s'affichait pas (problème de compatibilité)
- ❌ `@tiptap/extension-drag-handle-react` est un composant React (pas une extension)
- ✅ Ma version custom affiche le handle correctement
- ✅ Mais utilise les méthodes Tiptap pour le drag !

**Structure :**
```typescript
Plugin ProseMirror {
  handleDOMEvents: {
    mousemove: (view, event) => {
      // 1. Créer le handle si besoin
      // 2. Trouver le bloc sous la souris
      // 3. Positionner le handle à gauche du bloc
    },
    mouseleave: (view, event) => {
      // Cacher le handle
    }
  }
}
```

### **2. Package Tiptap : `@tiptap/extension-node-range`**

**Rôle :** Calculer les selection ranges

```typescript
import { getSelectionRanges, NodeRangeSelection } from '@tiptap/extension-node-range';

// Créer les ranges du noeud
const ranges = getSelectionRanges($from, $to, 0);

// Créer une sélection qui couvre tout le noeud
const selection = NodeRangeSelection.create(doc, from, to);

// Extraire le contenu (slice)
const slice = selection.content();
```

**Pourquoi c'est important :**
- ✅ `getSelectionRanges()` trouve **tous** les ranges d'un noeud
- ✅ Gère les noeuds complexes (tables avec thead/tbody, listes imbriquées)
- ✅ `NodeRangeSelection` crée une sélection propre
- ✅ `.content()` extrait le slice complet avec tous les attributs

### **3. ProseMirror Natif**

**Rôle :** Gérer le drag & drop effectif

```typescript
// On dit à ProseMirror : "Voilà ce que je drag"
view.dragging = { 
  slice: slice,  // Le contenu complet du bloc
  move: true     // C'est un déplacement, pas une copie
};
```

**Ce que ProseMirror fait ensuite :**
1. ✅ Écoute les événements `drop` nativement
2. ✅ Calcule la position de drop
3. ✅ Applique une transaction `replaceRange`
4. ✅ Préserve **TOUT** le contenu (markdown, attributs, structure)

---

## 📊 **SCHÉMA DU FLOW COMPLET**

```
┌─────────────────────────────────────────────────────────┐
│ 1. UTILISATEUR SURVOLE UN BLOC                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. MOUSEMOVE EVENT                                      │
│    ├─ posAtCoords() → Position dans le doc            │
│    ├─ resolve() → Trouver le noeud                     │
│    ├─ nodeDOM() → Trouver l'élément DOM                │
│    └─ Positionner le handle à gauche du bloc           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. HANDLE VISIBLE À GAUCHE                             │
│    Stocke data-node-pos="123" (début du bloc)          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. UTILISATEUR DRAG LE HANDLE                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. DRAGSTART EVENT                                      │
│    ├─ Récupérer data-node-pos                          │
│    ├─ resolve(pos) → Trouver le noeud                  │
│    ├─ getSelectionRanges() → Calculer les ranges       │
│    ├─ NodeRangeSelection.create() → Créer sélection    │
│    ├─ selection.content() → Extraire le slice          │
│    └─ view.dragging = { slice, move: true } ✨         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. PROSEMIRROR PREND LE RELAIS                         │
│    (On ne fait plus rien, ProseMirror gère !)          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 7. UTILISATEUR DROP LE BLOC                            │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 8. PROSEMIRROR GÈRE LE DROP (NATIF)                   │
│    ├─ Calcule la position de drop                      │
│    ├─ Supprime le bloc de l'ancienne position          │
│    ├─ Insère le slice à la nouvelle position           │
│    └─ Préserve tout le contenu (markdown, attrs, etc.) │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 9. ✅ BLOC DÉPLACÉ CORRECTEMENT                        │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 **POURQUOI C'EST HYBRIDE ?**

### **Problème 1 : Extension Officielle Ne S'Affiche Pas** ❌

```typescript
import DragHandle from '@tiptap/extension-drag-handle';

extensions.push(DragHandle.configure({
  render() { return handle; }
}));
```

**Résultat :** Le handle ne s'affiche jamais (`querySelector` retourne `null`)

**Cause probable :**
- Conflit avec d'autres extensions
- Version incompatible avec React 19
- Problème de timing dans le rendering

### **Solution : Extension Custom pour l'Affichage** ✅

```typescript
// Plugin ProseMirror custom
props: {
  handleDOMEvents: {
    mousemove: (view, event) => {
      // Créer et positionner le handle manuellement
      if (!globalDragHandle) {
        globalDragHandle = createDragHandle();
        view.dom.parentElement.appendChild(globalDragHandle);
      }
      
      // Positionner à gauche du bloc survolé
      const rect = targetElement.getBoundingClientRect();
      globalDragHandle.style.left = `${rect.left - 40}px`;
      globalDragHandle.style.top = `${rect.top + 2}px`;
    }
  }
}
```

**Résultat :** Le handle s'affiche correctement ! ✅

---

### **Problème 2 : Drag Manuel Casse le Contenu** ❌

**Ce que j'avais essayé d'abord :**
```typescript
// ❌ MAUVAISE MÉTHODE
addEventListener('drop', (e) => {
  const slice = doc.slice(from, from + nodeSize);
  tr.delete(from, from + nodeSize);
  tr.insert(adjustedTo, slice.content);
  view.dispatch(tr);
});
```

**Résultat :**
- ❌ Texte tronqué
- ❌ Blocs dupliqués
- ❌ Tables cassées
- ❌ Code/Mermaid perdent leurs attributs

**Cause :** Le calcul manuel des positions est compliqué et fragile.

---

### **Solution : Utiliser le Drag Natif de ProseMirror** ✅

**Code source officiel Tiptap :**
```typescript
// helpers/dragHandler.ts (dans @tiptap/extension-drag-handle)
export function dragHandler(event: DragEvent, editor: Editor) {
  const { view } = editor;
  
  // Créer les ranges
  const ranges = getSelectionRanges($from, $to, 0);
  
  // Créer la sélection
  const selection = NodeRangeSelection.create(doc, from, to);
  const slice = selection.content();
  
  // ✨ LA CLÉ MAGIQUE
  view.dragging = { slice, move: true };
  
  // Sélectionner
  tr.setSelection(selection);
  view.dispatch(tr);
}
```

**Ce que `view.dragging` fait :**
1. ✅ Active le système de drag natif de ProseMirror
2. ✅ ProseMirror écoute `drop` et gère tout automatiquement
3. ✅ Utilise `replaceRange` en interne (méthode robuste)
4. ✅ Préserve **TOUTE** la structure du document

**J'ai copié exactement cette méthode dans mon extension !**

---

## 🔧 **CODE FINAL - LES PARTIES CLÉS**

### **A. Création et Positionnement (Custom)**

```typescript
// src/extensions/NotionDragHandleExtension.tsx

// Variable globale (une seule instance)
let globalDragHandle: HTMLElement | null = null;

// Plugin ProseMirror
new Plugin({
  props: {
    handleDOMEvents: {
      mousemove: (view, event) => {
        // Créer le handle si besoin
        if (!globalDragHandle) {
          globalDragHandle = createDragHandle();
          view.dom.parentElement.appendChild(globalDragHandle);
        }
        
        // Trouver le bloc sous la souris
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        // ...
        
        // Positionner le handle
        globalDragHandle.style.left = `${rect.left - 40}px`;
        globalDragHandle.style.top = `${rect.top + 2}px`;
        globalDragHandle.style.opacity = '1';
        
        // Stocker la position du début du bloc
        globalDragHandle.setAttribute('data-node-pos', blockStartPos);
      }
    }
  }
})
```

### **B. Drag (Méthode Tiptap Officielle)**

```typescript
// Event listener sur le handle
globalDragHandle.addEventListener('dragstart', (e: DragEvent) => {
  const pos = parseInt(globalDragHandle.getAttribute('data-node-pos'));
  const { doc } = currentView.state;
  const node = doc.resolve(pos).nodeAfter;
  
  // Méthode Tiptap (copiée du code source)
  const from = pos;
  const to = pos + node.nodeSize;
  const ranges = getSelectionRanges(
    doc.resolve(from), 
    doc.resolve(to), 
    0
  );
  
  const selection = NodeRangeSelection.create(doc, from, to);
  const slice = selection.content();
  
  // ✨ MAGIE : ProseMirror prend le relais
  currentView.dragging = { slice, move: true };
  
  // Sélectionner visuellement
  const tr = currentView.state.tr.setSelection(selection);
  currentView.dispatch(tr);
});
```

### **C. Drop (ProseMirror Natif)**

**On ne fait RIEN !** ProseMirror gère automatiquement avec `view.dragging`.

---

## 📦 **DÉPENDANCES**

```typescript
// Packages Tiptap utilisés
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { getSelectionRanges, NodeRangeSelection } from '@tiptap/extension-node-range';
import type { EditorView } from '@tiptap/pm/view';
```

**Tous déjà installés !** ✅

---

## ✅ **AVANTAGES DE CETTE APPROCHE**

### **1. Robustesse**
- ✅ Utilise le drag natif de ProseMirror (testé et fiable)
- ✅ Pas de calcul manuel de positions (source de bugs)
- ✅ Préserve TOUT le contenu (markdown, attributs, structure)

### **2. Simplicité**
- ✅ Extension custom simple (195 lignes seulement)
- ✅ Pas besoin de gérer drop/insert manuellement
- ✅ ProseMirror fait le travail lourd

### **3. Compatibilité**
- ✅ Fonctionne avec TOUS les types de blocs :
  - Paragraphes
  - Titres (H1-H6)
  - Code blocks
  - Mermaid diagrams
  - Tables
  - Callouts
  - Images
  - Listes
  - Blockquotes
  - Horizontal rules

### **4. Performance**
- ✅ Une seule instance du handle (réutilisée)
- ✅ Pas de re-création à chaque mousemove
- ✅ RequestAnimationFrame pour le positionnement (si besoin)

---

## 🎨 **STYLES**

```css
/* notion-drag-handle.css */

.notion-drag-handle {
  position: absolute;
  z-index: 100;
  opacity: 0;
  transition: opacity 150ms ease;
}

.notion-drag-handle[style*="opacity: 1"] {
  opacity: 1;
}

.notion-drag-handle-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  cursor: grab;
}

.notion-drag-handle-btn svg {
  width: 20px;
  height: 34px; /* Allongé verticalement */
  color: rgba(0, 0, 0, 0.5);
}
```

---

## 🔍 **DEBUGGING**

### **Vérifier que le Handle Existe**
```javascript
document.querySelector('.notion-drag-handle')
// Devrait retourner un <div>
```

### **Vérifier la Position**
```javascript
const h = document.querySelector('.notion-drag-handle');
console.log({
  left: h.style.left,
  top: h.style.top,
  opacity: h.style.opacity,
  dataPos: h.getAttribute('data-node-pos')
});
```

### **Logs de Debug**
Dans la console tu vois :
```
✅ Handle créé et ajouté au DOM
  📍 Position calculée: {nodePos: 100, blockStartPos: 100, depth: 1}
🚀 DRAGSTART, pos: 100
  📦 Node: {type: 'paragraph', size: 150}
  ✅ Ranges créés: 1
  ✅ Slice créée, size: 148
  ✅ view.dragging défini, ProseMirror prend le relais !
```

---

## 🎯 **EN RÉSUMÉ**

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Affichage du handle** | Extension custom | Créer et positionner le handle visuellement |
| **Calcul des ranges** | `@tiptap/extension-node-range` | Calculer les selection ranges du bloc |
| **Drag & drop** | ProseMirror natif | Gérer le déplacement sans bugs |

**C'est un mix parfait entre :**
- 🎨 Custom UI (pour afficher le handle)
- 🧠 Logique Tiptap (pour les ranges)
- ⚡ Natif ProseMirror (pour le drag/drop)

**Résultat : Ça marche ! 🎉**

---

**Auteur :** Claude (Sonnet 4.5)  
**Date :** 07 Octobre 2025  
**Statut :** ✅ **FONCTIONNEL**



