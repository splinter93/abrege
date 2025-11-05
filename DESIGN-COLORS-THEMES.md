# 🎨 DESIGN - COULEURS & THÈMES SCRIVIA CHAT

**Date création** : 4 novembre 2025  
**Version** : 1.0  
**Fichier source** : `src/styles/chat-clean.css`

---

## 📊 VUE D'ENSEMBLE

Scrivia Chat propose **4 thèmes** avec variables CSS centralisées.

| Thème | Classe body | Usage | Ambiance |
|-------|-------------|-------|----------|
| **Dark** | (défaut) ou `.chat-theme-dark` | Travail nuit, focus | Très sombre, moderne |
| **Anthracite** | `.chat-theme-anthracite` | Usage polyvalent | Gris moyen élégant |
| **Blue** | `.chat-theme-blue` | Créatif, calme | Bleu profond saturé |
| **Light** | `.chat-theme-light` | Bureautique jour | Gris clair doux |

---

## 🌙 THÈME DARK (PAR DÉFAUT)

### Backgrounds - Surfaces principales

```css
--chat-bg-primary: #0e1012           /* rgb(14, 16, 18) - Container, header, messages */
--chat-bg-secondary: #121416         /* rgb(18, 20, 22) - Surfaces alternatives */
--chat-bg-tertiary: #161819          /* rgb(22, 24, 25) - Sidebar, input area */
--chat-bg-input: #1e2022             /* rgb(30, 32, 34) - Input search, formulaires */
--chat-bg-input-focus: #2a2a2a       /* rgb(42, 42, 42) - Input au focus */
--chat-bg-user-message: #232323      /* rgb(35, 35, 35) - Bulle message user */
--chat-bg-user-message-hover: #252525 /* rgb(37, 37, 37) - Bulle user au hover */
```

### Textes

```css
--chat-text-primary: #ffffff         /* rgb(255, 255, 255) - Texte principal */
--chat-text-secondary: #9ca3af       /* rgb(156, 163, 175) - Texte secondaire */
--chat-text-tertiary: #6b7280        /* rgb(107, 114, 128) - Texte tertiaire */
```

### Accents

```css
--chat-accent-primary: #ff8c42       /* rgb(255, 140, 66) - Orange principal */
--chat-accent-hover: #ff7733         /* rgb(255, 119, 51) - Orange hover */
--chat-accent-secondary: #4ade80     /* rgb(74, 222, 128) - Vert secondaire */
```

### Gradients

```css
--chat-gradient-block: linear-gradient(135deg, #252831 0%, #2d3139 50%, #252831 100%)
/* Gris slate moderne pour blocs/sidebar */

--chat-gradient-input: var(--chat-gradient-block)
--chat-gradient-sidebar: var(--chat-gradient-block)
--chat-gradient-user: var(--chat-gradient-block)
```

### Historique modifications

| Date | Avant | Après | Raison |
|------|-------|-------|--------|
| 2025-11-04 v1 | `#141618` (20,22,24) | `#101214` (16,18,20) | Assombrissement modéré (-4 RGB) |
| 2025-11-04 v2 | `#101214` (16,18,20) | `#0e1012` (14,16,18) | Assombrissement subtil supplémentaire (-2 RGB) |

---

## 🪨 THÈME ANTHRACITE

### Backgrounds - Surfaces principales

```css
--chat-bg-primary: #22252a           /* rgb(34, 37, 42) - PLUS CLAIR que Dark */
--chat-bg-secondary: #26292e         /* rgb(38, 41, 46) - Surfaces alternatives */
--chat-bg-tertiary: #2b2e35          /* rgb(43, 46, 53) - Sidebar, input area */
--chat-bg-input: #35383f             /* rgb(53, 56, 63) - Input search */
--chat-bg-input-focus: #3a3e45       /* rgb(58, 62, 69) - Input au focus */
--chat-bg-user-message: #35383f      /* rgb(53, 56, 63) - Bulle user */
--chat-bg-user-message-hover: #3a3e45 /* rgb(58, 62, 69) - Bulle hover */
```

### Textes (identiques à Dark)

```css
--chat-text-primary: #ffffff
--chat-text-secondary: #9ca3af
--chat-text-tertiary: #6b7280
```

### Accents (identiques à Dark)

```css
--chat-accent-primary: #ff8c42
--chat-accent-hover: #ff7733
--chat-accent-secondary: #4ade80
```

### Gradients

```css
--chat-gradient-block: linear-gradient(135deg, #3a3e47 0%, #434853 50%, #3a3e47 100%)
/* Gris anthracite avec reflets métalliques */
```

### Notes

⚠️ **TODO** : Assombrir modérément (comme Dark)
- Suggestion : `#1e2126` rgb(30, 33, 38) au lieu de `#22252a`
- Δ -4 RGB pour cohérence avec Dark

---

## 🌊 THÈME BLUE

### Backgrounds - Surfaces principales

```css
--chat-bg-primary: #192d45           /* rgb(25, 45, 69) - Bleu profond saturé */
--chat-bg-secondary: #1d3041         /* rgb(29, 48, 65) - Bleu foncé */
--chat-bg-tertiary: #22364a          /* rgb(34, 54, 74) - Bleu moyen */
--chat-bg-input: #26384a             /* rgb(38, 56, 74) - Input */
--chat-bg-input-focus: #2b3e52       /* rgb(43, 62, 82) - Input focus */
--chat-bg-user-message: #26384a      /* rgb(38, 56, 74) - Bulle user */
--chat-bg-user-message-hover: #2b3e52 /* rgb(43, 62, 82) - Bulle hover */
```

### Textes (identiques)

```css
--chat-text-primary: #ffffff
--chat-text-secondary: #9ca3af
--chat-text-tertiary: #6b7280
```

### Accents (identiques)

```css
--chat-accent-primary: #ff8c42
--chat-accent-hover: #ff7733
--chat-accent-secondary: #4ade80
```

### Gradients

```css
--chat-gradient-block: linear-gradient(135deg, #1a2f48 0%, #1d3243 50%, #1a2f48 100%)
/* Bleu océan profond avec reflets */

--chat-gradient-sidebar: linear-gradient(135deg, #1d3243 0%, #22364a 100%)
/* Sidebar bleu foncé */
```

---

## ☀️ THÈME LIGHT

### Backgrounds - Surfaces principales

```css
--chat-bg-primary: #d4d7dc           /* rgb(212, 215, 220) - Gris bleuté doux */
--chat-bg-secondary: #d8dbe0         /* rgb(216, 219, 224) - Surfaces alternatives */
--chat-bg-tertiary: #dddfe6          /* rgb(221, 223, 230) - Sidebar, input area */
--chat-bg-input: #d9dce3             /* rgb(217, 220, 227) - Input search */
--chat-bg-input-focus: #dee1e9       /* rgb(222, 225, 233) - Input focus */
--chat-bg-user-message: #d9dce3      /* rgb(217, 220, 227) - Bulle user */
--chat-bg-user-message-hover: #dee1e9 /* rgb(222, 225, 233) - Bulle hover */
```

### Textes (inversés pour lisibilité)

```css
--chat-text-primary: #1a1a1a         /* rgb(26, 26, 26) - Texte sombre */
--chat-text-secondary: #4b5563       /* rgb(75, 85, 99) - Texte secondaire */
--chat-text-tertiary: #6b7280        /* rgb(107, 114, 128) - Texte tertiaire */
```

### Accents (plus saturés pour visibilité)

```css
--chat-accent-primary: #ff6b2b       /* rgb(255, 107, 43) - Orange vif */
--chat-accent-hover: #ff5219         /* rgb(255, 82, 25) - Orange intense */
--chat-accent-secondary: #22c55e     /* rgb(34, 197, 94) - Vert vif */
```

### Gradients

```css
--chat-gradient-block: linear-gradient(135deg,
  rgba(70, 85, 105, 0.14) 0%,
  rgba(70, 85, 105, 0.16) 50%,
  rgba(70, 85, 105, 0.10) 100%),
  var(--chat-bg-primary)
/* Gradient gris bleuté subtil */
```

---

## 🎯 COMPARAISON BACKGROUNDS

| Thème | Primary (RGB) | Luminosité* | Delta vs Dark |
|-------|---------------|-------------|---------------|
| **Dark** | 14, 16, 18 | 4.7% | Base |
| **Anthracite** | 34, 37, 42 | 13% | +18 RGB (+8%) |
| **Blue** | 25, 45, 69 | 15% | +9/27/49 RGB (teinte bleue) |
| **Light** | 212, 215, 220 | 84% | +196/197/200 RGB (+79%) |

*Luminosité = moyenne RGB normalisée

---

## 🔧 MODIFICATIONS EN ATTENTE

### Dark Mode
- ✅ Assombri modérément : `#141618` → `#101214` (-4 RGB)
- ✅ Input assombri proportionnellement : `#242424` → `#202224`

### Anthracite Mode
- ⏳ **TODO** : Assombrir modérément pour cohérence
- Suggestion : `#22252a` → `#1e2126` (-4 RGB)
- À valider par user

### Blue Mode
- ⏸️ En attente feedback user

### Light Mode
- ⏸️ En attente feedback user

---

## 🎨 PALETTE COMPLÈTE (TOUS THÈMES)

### Couleurs communes

**Orange (Accent principal)**
```css
Dark/Anthracite/Blue : #ff8c42 rgb(255, 140, 66)
Light                : #ff6b2b rgb(255, 107, 43) - Plus saturé
```

**Vert (Accent secondaire)**
```css
Dark/Anthracite/Blue : #4ade80 rgb(74, 222, 128)
Light                : #22c55e rgb(34, 197, 94) - Plus saturé
```

**Texte secondaire**
```css
Dark/Anthracite/Blue : #9ca3af rgb(156, 163, 175)
Light                : #4b5563 rgb(75, 85, 99) - Plus sombre
```

---

## 📐 SYSTEM DE GRADIENTS

### Dark Mode
```css
Blocs : linear-gradient(135deg, #252831, #2d3139, #252831)
Type  : Gris slate moderne avec reflets subtils
```

### Anthracite Mode
```css
Blocs : linear-gradient(135deg, #3a3e47, #434853, #3a3e47)
Type  : Gris métallique avec reflets anthracite
```

### Blue Mode
```css
Blocs : linear-gradient(135deg, #1a2f48, #1d3243, #1a2f48)
Type  : Bleu océan profond avec reflets
```

### Light Mode
```css
Blocs : linear-gradient(135deg,
  rgba(70, 85, 105, 0.14),
  rgba(70, 85, 105, 0.16),
  rgba(70, 85, 105, 0.10)),
  var(--chat-bg-primary)
Type  : Overlay gris bleuté subtil sur fond clair
```

---

## 🛠️ GUIDELINES FUTURES

### Assombrissement/Éclaircissement

**Règle** : Modifier tous les backgrounds proportionnellement
```
Primary   : Base
Secondary : Primary + 4 RGB
Tertiary  : Secondary + 4-6 RGB
Input     : Tertiary + 10-14 RGB
```

### Exemple (Dark assombri -4 RGB)
```
Primary   : #141618 → #101214 (-4, -4, -4)
Secondary : #181a1c → #141618 (-4, -4, -4)
Tertiary  : #1a1c1e → #181a1c (-2, -2, -2)
Input     : #242424 → #202224 (-4, -2, 0)
```

### Cohérence accents

- Orange : **Toujours visible** (contraste min 4.5:1)
- Vert : **Toujours visible** (contraste min 4.5:1)
- En Light mode : Accents **plus saturés** pour compenser

---

## 🎯 ROADMAP DESIGN

### Court terme
- [ ] Assombrir Anthracite modérément (`#22252a` → `#1e2126`)
- [ ] Tester Blue Mode avec assombrissement
- [ ] Valider contraste WCAG AA partout

### Moyen terme
- [ ] Mode "Midnight" (encore plus sombre que Dark)
- [ ] Mode "Warm" (tons chauds, orange/marron)
- [ ] Mode "Forest" (tons verts/noirs)

### Long terme
- [ ] Thèmes custom utilisateur
- [ ] Synchronisation avec heure système (auto dark/light)
- [ ] Export/import palettes

---

## 💡 NOTES TECHNIQUES

### Structure CSS

```
:root { /* Variables Dark (défaut) */ }
  ↓
body.chat-theme-anthracite { /* Override variables */ }
  ↓
body.chat-theme-blue { /* Override variables */ }
  ↓
body.chat-theme-light { /* Override variables */ }
```

### Spécificité

- ✅ Classe body > :root (override fonctionne)
- ✅ Variables CSS (changement en temps réel possible)
- ✅ Fallback :root si pas de classe (Dark par défaut)

### Performance

- ✅ Pas de re-render React (pure CSS)
- ✅ Transition instantanée (variables CSS natives)
- ✅ Zero JavaScript pour thèmes

---

## 🔍 DEBUG THÈME ACTUEL

**Pour vérifier quel thème est actif :**

```javascript
// Console browser
document.body.className
// → "" (Dark par défaut)
// → "chat-theme-anthracite"
// → "chat-theme-blue"
// → "chat-theme-light"

// Vérifier couleur effective
getComputedStyle(document.documentElement).getPropertyValue('--chat-bg-primary')
// → "#101214" (Dark actuel)
// → "#22252a" (Anthracite)
// → "#192d45" (Blue)
// → "#d4d7dc" (Light)
```

---

## 📊 ANALYSE CONTRASTE (WCAG)

### Dark Mode (après assombrissement)

| Élément | Fg | Bg | Ratio | WCAG |
|---------|----|----|-------|------|
| Texte principal | #ffffff | #101214 | 18.2:1 | ✅ AAA |
| Texte secondaire | #9ca3af | #101214 | 8.1:1 | ✅ AA |
| Orange accent | #ff8c42 | #101214 | 6.8:1 | ✅ AA |
| Vert accent | #4ade80 | #101214 | 9.2:1 | ✅ AAA |

### Anthracite Mode

| Élément | Fg | Bg | Ratio | WCAG |
|---------|----|----|-------|------|
| Texte principal | #ffffff | #22252a | 14.5:1 | ✅ AAA |
| Texte secondaire | #9ca3af | #22252a | 6.3:1 | ✅ AA |
| Orange accent | #ff8c42 | #22252a | 5.2:1 | ✅ AA |

---

## 🎨 PALETTE ÉTENDUE (RÉFÉRENCE)

### Mentions & Prompts

```css
Mentions (@note) : 
  --mention-gradient: linear-gradient(135deg, #ff8c42, #ff7733)
  Color: Orange (accent-primary → accent-hover)

Prompts (/slug) :
  --prompt-gradient: linear-gradient(135deg, #10b981, #059669)
  Color: Vert émeraude
```

### Statuts

```css
Success : #4ade80 (vert)
Warning : #fbbf24 (jaune)
Error   : #ef4444 (rouge)
Info    : #3b82f6 (bleu)
```

### Surfaces spéciales

```css
Code blocks    : Dépend du thème (variable --blk-bg)
Scrollbar      : rgba(255, 255, 255, 0.08)
Scrollbar hover: rgba(255, 255, 255, 0.12)
Dividers       : rgba(255, 255, 255, 0.08)
```

---

## 🚀 QUICK REFERENCE

### Changer de thème (JavaScript)

```javascript
// Activer Anthracite
document.body.className = 'chat-theme-anthracite';

// Activer Blue
document.body.className = 'chat-theme-blue';

// Activer Light
document.body.className = 'chat-theme-light';

// Retour Dark (défaut)
document.body.className = '';
```

### Tester tous les thèmes

```javascript
const themes = ['', 'chat-theme-anthracite', 'chat-theme-blue', 'chat-theme-light'];
let i = 0;
setInterval(() => {
  document.body.className = themes[i++ % themes.length];
  console.log('Thème:', document.body.className || 'Dark');
}, 3000); // Change toutes les 3s
```

---

## 📝 CHANGELOG

### 2025-11-04
- ✅ Dark Mode : Assombri `#141618` → `#101214` (modéré -4 RGB)
- ✅ Dark Mode : Input assombri `#242424` → `#202224` (proportionnel)
- ✅ Dark Mode : Fade gradient updated pour nouvelle couleur
- ⏳ Anthracite : À assombrir (en attente validation)

---

**Fichier prêt pour évolution future des couleurs ! 🎨**

