# Analyse : ce qui change en dessous de 768px (chat)

Quand la largeur passe **en dessous de 768px**, plusieurs feuilles CSS s’appliquent en même temps. Voici ce qui change et d’où ça vient.

---

## 1. Ordre de chargement des CSS (layout.tsx)

1. `globals.css` (qui importe **chat-clean.css**)
2. **pwa-mobile.css**
3. **chat-mobile.css**

Donc : **chat-clean** (base) → **pwa-mobile** (noir + safe areas) → **chat-mobile** (layout mobile). Les règles des fichiers chargés en dernier écrasent les précédentes à spécificité égale.

---

## 2. Noir absolu (couleur de fond)

**Fichier : `pwa-mobile.css`**  
**Bloc : `@media (max-width: 768px)`**  
**Condition :** uniquement si `html` a la classe **`chat-page`** (ajoutée par ChatFullscreenV2 au montage).

Ce qui est forcé en noir :

- Variables : `--color-bg-primary: #000000`, `--chat-bg-primary: #000000`
- `html.chat-page`, `html.chat-page body` : fond `#000`, plus d’image de fond
- Puis fond `#000 !important` sur :
  - `.chatgpt-container`
  - `.chatgpt-main`
  - `.chatgpt-content`
  - `.chatgpt-main-chat`
  - `.chatgpt-header`
  - `.chatgpt-chat-bottom`
  - `.chatgpt-chat-footer`
  - `.chatgpt-messages-container` et son `::before`

Le container d’input (`.chatgpt-input-container`) est explicitement laissé **transparent** dans ce même bloc.

**En résumé :** en dessous de 768px, sur la page chat, **pwa-mobile.css** impose le noir partout (sauf le container d’input).

---

## 3. Changements de layout, espacements, largeurs

### 3.1 `chat-mobile.css` — `@media (max-width: 768px)` (lignes 42–206)

C’est le **“CSS mobile”** du chat : tout le passage en layout “mobile” (barre fixe, header fixe, paddings, largeurs) vient de là.

| Élément | Changement |
|--------|------------|
| **.chatgpt-container** | `height: 100vh` / `100dvh`, `padding-top: 0`, `top/bottom: 0 !important` |
| **.chatgpt-main** | `height: 100%`, `flex: 1`, `min-height: 0` |
| **.chatgpt-messages-container** | `flex: 1`, `min-height: 0`, **`padding-bottom: 150px`** (réserve pour input + footer) |
| **.chatgpt-chat-bottom** | **`position: fixed`**, `bottom: 0`, `left/right: 0`, `z-index: 10`, `max-width: 100vw`, `width: 100%` |
| **.chatgpt-input-container** | `padding: 0 ... 0` (pas de padding top), `max-height: 45vh`, etc. |
| **.chatgpt-chat-footer** | `min-height: 16px`, `padding-bottom` avec safe-area |
| **.chatgpt-header** | **`position: fixed`**, `height: 56px`, `padding: 8px` + var, **`width: 100%`**, **`max-width: 100vw`** |
| **.chatgpt-content** | **`margin-top: calc(56px + env(safe-area-inset-top))`** (sous le header fixe) |
| **.chat-header** | `padding: 8px ...`, `gap: 8px` |
| **.chat-header-title** | `font-size: 16px` |
| **.chat-messages-container** | **`max-width: 100%`**, **`padding: 0 var(--chat-padding-horizontal, 12px)`** |
| **.chat-message** | **`padding: 12px`** |
| **.chat-message-user** | **`max-width: 90%`** |
| **.chat-message-assistant** | **`max-width: 100%`** |
| **.chat-avatar** | `32px` |
| **.chat-sidebar** | `position: fixed`, `transform: translateX(-100%)`, overlay |
| Modals | `width/height: 100%`, `border-radius: 0` (fullscreen) |

Donc : **largeurs** (100%, 90%, 100vw), **espacements** (padding 12px, 8px, 150px en bas), **position fixed** (header + barre du bas), **margin-top** du contenu, tout ça vient de **chat-mobile.css** à 768px.

### 3.2 `chat-clean.css` — `@media (max-width: 1023px)` (lignes 2589–2681)

Ce bloc s’applique **dès 1023px** (donc aussi en dessous de 768px). Il modifie surtout header, messages et sidebar :

| Élément | Changement |
|--------|------------|
| **.chatgpt-header** | `padding` avec `--chat-space-md` et safe-areas, **`height: calc(56px + var(--chat-safe-top))`**, **`max-width: 100vw`** |
| **.chatgpt-header-left** | **`margin-left: -7px`** (bouton proche du bord) |
| **.chatgpt-messages-container** | **`padding-bottom: calc(100px + var(--chat-safe-bottom))`** (ou 150px selon qui gagne avec chat-mobile) |
| **.chatgpt-messages-container::before** | `height: 5px` (fade en haut) |
| **.chatgpt-messages** | `padding-top` avec safe-top |
| **.chatgpt-message-bubble-user** | **`max-width: 85%`** |
| **.chatgpt-message-bubble-assistant** | **`width: 100%`, `max-width: 100%`** |
| **.chatgpt-input-area** | `padding: 12px` (quand sidebar fermée) |
| **.chatgpt-input-textarea** | **`font-size: 16px !important`** (éviter zoom iOS) |
| **.sidebar-ultra-clean** | `transform: translateX(-250px)` (cachée par défaut), overlay masquée |
| **.chat-note-selector** | `width: 250px`, `max-width: calc(100vw - 80px)` |

Donc une partie des **espacements** et **largeurs** (85%, 100%, 100vw, paddings) vient aussi de **chat-clean.css** en dessous de 1023px (donc < 768px aussi).

### 3.3 `chat-clean.css` — `@media (max-width: 768px)` (lignes 2029, 3887)

- Un bloc pour **.canva-status-indicator** (position, largeur, radius).
- Un bloc pour **.textarea-highlight-content** / **.textarea-with-mentions-input** (font-size 16px, line-height, padding).

Pas de changement de layout global du chat ici, surtout canva et zone de saisie.

---

## 4. Synthèse : qui fait quoi en dessous de 768px

| Effet | Fichier | Condition / remarque |
|-------|---------|----------------------|
| **Noir absolu** (fond page + zones chat) | **pwa-mobile.css** | `@media (max-width: 768px)` + **`html.chat-page`** |
| **Layout mobile** (header fixe, barre bas fixe, 100dvh, etc.) | **chat-mobile.css** | `@media (max-width: 768px)` |
| **Espacements / largeurs** (padding 12px, 150px bas, max-width 90% / 100%, etc.) | **chat-mobile.css** + **chat-clean.css** (1023px) | Les deux s’appliquent en < 768px |
| **Header** (hauteur, padding, max-width 100vw) | **chat-clean.css** (1023px) + **chat-mobile.css** (768px) | Les deux se cumulent |
| **Scrollbars masquées, sidebar cachée, note selector** | **chat-clean.css** | `@media (max-width: 1023px)` |

Donc :

- **Oui, c’est bien “un autre CSS”** qui s’applique : **chat-mobile.css** (et en partie **chat-clean.css** en 1023px).
- **Noir absolu** = **pwa-mobile.css** quand `html.chat-page` est présent.
- **Changement de design** (largeurs, espacements, barre/header fixes) = surtout **chat-mobile.css** à 768px, plus **chat-clean.css** à 1023px.

Si tu veux le même design qu’au-dessus de 768px (sans noir, sans layout mobile), il faudrait soit :
- ne pas appliquer les blocs `@media (max-width: 768px)` de **pwa-mobile** et **chat-mobile** sur la page chat, soit  
- introduire un breakpoint différent (par ex. 480px) pour ne passer en “mobile” qu’en dessous, et garder le style actuel entre 480px et 768px.
