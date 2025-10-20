# 🎨 Guide du système de thèmes - Chat Scrivia

## 📚 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Thèmes disponibles](#thèmes-disponibles)
3. [Utilisation](#utilisation)
4. [Variables CSS](#variables-css)
5. [Créer un thème personnalisé](#créer-un-thème-personnalisé)

---

## 🎯 Vue d'ensemble

Le chat Scrivia utilise un **système de design tokens** professionnel permettant de changer facilement l'apparence complète de l'interface en modifiant uniquement les variables CSS.

### Avantages :
- ✅ **Maintenabilité** : 0 valeur hardcodée dans le code
- ✅ **Flexibilité** : Changer de thème = changer une classe CSS
- ✅ **Scalabilité** : Ajouter un thème = définir 30 variables
- ✅ **Performance** : CSS natif, aucune dépendance JS

---

## 🎨 Thèmes disponibles

### 1. **Mode Sombre (défaut)**
```css
/* Appliqué automatiquement */
```

**Caractéristiques :**
- Background principal : `#121212`
- Texte : Off-white `#e5e5e5`
- Optimisé pour une utilisation prolongée

### 2. **Mode Clair**
```html
<body class="chat-theme-light">
```

**Caractéristiques :**
- Background principal : `#ffffff`
- Texte : Dark gray `#111827`
- Optimisé pour la lecture en plein jour

### 3. **Mode Glass (Glassmorphism)**
```html
<body class="chat-theme-glass">
```

**Caractéristiques :**
- Backgrounds transparents + blur
- Effet `backdrop-filter: blur(20px)`
- Design moderne et élégant

---

## 🚀 Utilisation

### Changer de thème dynamiquement (JavaScript)

```typescript
// Mode sombre (défaut)
document.body.classList.remove('chat-theme-light', 'chat-theme-glass');

// Mode clair
document.body.classList.add('chat-theme-light');

// Mode glass
document.body.classList.add('chat-theme-glass');
```

### Exemple : Toggle Light/Dark

```typescript
const toggleTheme = () => {
  const isLight = document.body.classList.contains('chat-theme-light');
  document.body.classList.toggle('chat-theme-light', !isLight);
};
```

---

## 📦 Variables CSS

### 🎨 Backgrounds (Surfaces principales)

| Variable | Usage | Défaut (Dark) |
|----------|-------|---------------|
| `--chat-bg-primary` | Container, header, messages | `#121212` |
| `--chat-bg-secondary` | Surfaces alternatives | `#161616` |
| `--chat-bg-tertiary` | Sidebar, chat input area | `#181818` |
| `--chat-bg-input` | Input search, formulaires | `#1f1f1f` |
| `--chat-bg-input-focus` | Input au focus | `#252525` |
| `--chat-bg-user-message` | Bulle message user | `#1e1e1e` |
| `--chat-bg-user-message-hover` | Bulle user au hover | `#202020` |

### 🌫️ Overlays (Effets de surface)

| Variable | Usage | Défaut (Dark) |
|----------|-------|---------------|
| `--chat-overlay-subtle` | Hover très léger | `rgba(255, 255, 255, 0.02)` |
| `--chat-overlay-soft` | Backgrounds doux | `rgba(255, 255, 255, 0.03)` |
| `--chat-overlay-active` | État actif | `rgba(255, 255, 255, 0.04)` |
| `--chat-overlay-input` | Input backgrounds | `rgba(255, 255, 255, 0.05)` |
| `--chat-overlay-input-focus` | Input focus | `rgba(255, 255, 255, 0.08)` |
| `--chat-overlay-hover` | Hover buttons | `rgba(255, 255, 255, 0.1)` |
| `--chat-overlay-dark` | Mobile overlay | `rgba(0, 0, 0, 0.5)` |

### 📝 Texte (Hiérarchie typographique)

| Variable | Usage | Défaut (Dark) |
|----------|-------|---------------|
| `--chat-text-primary` | Texte principal | `#e5e5e5` |
| `--chat-text-secondary` | Texte secondaire | `#d1d5db` |
| `--chat-text-muted` | Texte discret, labels | `#9ca3af` |
| `--chat-text-success` | Texte succès | `#22c55e` |
| `--chat-text-error` | Texte erreur | `#ef4444` |
| `--chat-text-error-hover` | Texte erreur hover | `#dc2626` |

### 🔥 Accents (Couleurs d'action)

| Variable | Usage | Défaut |
|----------|-------|--------|
| `--chat-accent-primary` | Bouton envoi, liens | `#e55a2b` |
| `--chat-accent-hover` | Hover accent | `#f5652c` |

### 🔲 Bordures

| Variable | Usage | Défaut (Dark) |
|----------|-------|---------------|
| `--chat-border-subtle` | Bordures discrètes | `rgba(255, 255, 255, 0.1)` |
| `--chat-border-soft` | Bordures très douces | `rgba(255, 255, 255, 0.08)` |

### ⚡ États spéciaux

| Variable | Usage | Défaut |
|----------|-------|--------|
| `--chat-bg-success` | Background succès | `rgba(34, 197, 94, 0.1)` |
| `--chat-bg-error` | Background erreur | `rgba(239, 68, 68, 0.1)` |
| `--chat-bg-error-hover` | Background erreur hover | `rgba(239, 68, 68, 0.2)` |
| `--chat-border-error` | Bordure erreur | `rgba(239, 68, 68, 0.3)` |

---

## 🛠️ Créer un thème personnalisé

### Exemple : Thème "Midnight Blue"

```css
.chat-theme-midnight {
  /* Backgrounds */
  --chat-bg-primary: #0a0e27;
  --chat-bg-secondary: #0f1433;
  --chat-bg-tertiary: #141a3f;
  --chat-bg-input: #1a2150;
  --chat-bg-input-focus: #1f2860;
  --chat-bg-user-message: #1e3a8a;
  --chat-bg-user-message-hover: #1d4ed8;
  
  /* Overlays */
  --chat-overlay-subtle: rgba(96, 165, 250, 0.05);
  --chat-overlay-soft: rgba(96, 165, 250, 0.08);
  --chat-overlay-active: rgba(96, 165, 250, 0.12);
  --chat-overlay-hover: rgba(96, 165, 250, 0.15);
  
  /* Texte */
  --chat-text-primary: #e0e7ff;
  --chat-text-secondary: #c7d2fe;
  --chat-text-muted: #a5b4fc;
  
  /* Accent */
  --chat-accent-primary: #3b82f6;
  --chat-accent-hover: #60a5fa;
  
  /* Bordures */
  --chat-border-subtle: rgba(96, 165, 250, 0.2);
  --chat-border-soft: rgba(96, 165, 250, 0.15);
}
```

### Utilisation :
```html
<body class="chat-theme-midnight">
```

---

## 📋 Checklist pour un nouveau thème

### Obligatoire (30 variables) :
- [ ] 7 backgrounds (`--chat-bg-*`)
- [ ] 7 overlays (`--chat-overlay-*`)
- [ ] 6 textes (`--chat-text-*`)
- [ ] 2 accents (`--chat-accent-*`)
- [ ] 2 bordures (`--chat-border-*`)
- [ ] 4 états spéciaux (`--chat-bg-success`, etc.)

### Recommandé :
- [ ] Tester le contraste texte/fond (WCAG AA minimum)
- [ ] Vérifier la lisibilité sur écran 4K et mobile
- [ ] Tester avec différents contenus (markdown, code, erreurs)
- [ ] Valider les hovers et états actifs

---

## 💡 Bonnes pratiques

### ✅ À faire :
- Utiliser UNIQUEMENT les variables CSS
- Respecter les ratios de contraste WCAG
- Tester sur différents écrans
- Documenter les thèmes personnalisés

### ❌ À éviter :
- Hardcoder des couleurs dans le code
- Oublier les états hover/active/focus
- Ignorer l'accessibilité
- Modifier directement `chat-clean.css`

---

## 🔧 Intégration dans l'app

### Exemple : Composant de sélection de thème

```typescript
// ThemeSelector.tsx
import { useState } from 'react';

const themes = ['default', 'light', 'glass'] as const;
type Theme = typeof themes[number];

export const ThemeSelector = () => {
  const [theme, setTheme] = useState<Theme>('default');
  
  const applyTheme = (newTheme: Theme) => {
    document.body.classList.remove('chat-theme-light', 'chat-theme-glass');
    
    if (newTheme === 'light') {
      document.body.classList.add('chat-theme-light');
    } else if (newTheme === 'glass') {
      document.body.classList.add('chat-theme-glass');
    }
    
    setTheme(newTheme);
    localStorage.setItem('chat-theme', newTheme);
  };
  
  return (
    <div>
      {themes.map(t => (
        <button 
          key={t} 
          onClick={() => applyTheme(t)}
          className={theme === t ? 'active' : ''}
        >
          {t}
        </button>
      ))}
    </div>
  );
};
```

---

## 📞 Support

Pour toute question sur le système de thèmes :
- 📄 Fichier source : `src/styles/chat-clean.css`
- 🎨 Design tokens : Lignes 27-117
- 🌈 Thèmes : Lignes 119-187

---

**Dernière mise à jour** : Octobre 2025
**Version** : 2.0 (Design Tokens System)

