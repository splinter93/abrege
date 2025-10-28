# 🎨 GUIDE - CRÉER DE NOUVEAUX THÈMES

## ✅ ÉTAT ACTUEL - PRODUCTION READY

### **Système de thèmes isolé et robuste**

**Isolation** : ✅ Parfaite
- Chaque thème = Bloc CSS distinct avec sélecteur de classe
- Classes appliquées dynamiquement sur `<body>`
- Aucune fuite de styles entre thèmes

**Production-ready** : ✅ 100%
- ✅ Hook TypeScript robuste (`useTheme`)
- ✅ Persistence localStorage
- ✅ Détection préférence système
- ✅ Gestion hydration SSR
- ✅ Fallback gracieux
- ✅ Pas de hardcoded values (tout en CSS variables)

---

## 📋 THÈMES ACTUELS

| Thème | Classe CSS | Label | Icône |
|-------|-----------|-------|-------|
| **Dark** | (défaut) | Mode sombre | 🌙 |
| **Light** | `.chat-theme-light` | Mode clair | ☀️ |
| **Blue** | `.chat-theme-blue` | Mode blue | 💙 |

---

## 🎯 TEMPLATE - MODE BLEU (MODÈLE PARFAIT)

### **Pourquoi utiliser Blue comme template ?**

1. ✅ **Dégradés ultra-lissés** (technique parfaite)
2. ✅ **Couleurs opaques saturées** (pas de transparence)
3. ✅ **Sidebar unifiée** (même gradient partout)
4. ✅ **Hiérarchie claire** (search < focus < hover < active)
5. ✅ **2 variables texte** (primary + secondary)
6. ✅ **Sans bordures** (design moderne)

---

## 🔧 CRÉER UN NOUVEAU THÈME (ex: Purple/Violet)

### **ÉTAPE 1 : Ajouter dans `useTheme.ts`**

```typescript
// src/hooks/useTheme.ts

export type ChatTheme = 'dark' | 'light' | 'blue' | 'purple'; // ✅ Ajouter 'purple'

export const CHAT_THEMES = {
  dark: { ... },
  light: { ... },
  blue: { ... },
  purple: {  // ✅ Nouveau thème
    value: 'purple' as const,
    label: 'Mode violet',
    icon: '💜',
    className: 'chat-theme-purple',
  },
} as const;
```

**Modifier aussi la validation localStorage (ligne 107)** :
```typescript
if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'blue' || savedTheme === 'purple')) {
```

---

### **ÉTAPE 2 : CSS dans `chat-clean.css`**

Copier le bloc Blue et adapter les couleurs :

```css
/* ========================================
   THÈME PURPLE MODE - DÉGRADÉS OPAQUES MODERNES
   ========================================
   Usage : Ajouter .chat-theme-purple sur body
   Style : Dégradés opaques, sans bordures, minimaliste premium
   ======================================== */
body.chat-theme-purple,
.chat-theme-purple {
  /* Background principal - Violet saturé */
  --chat-bg-primary: #2d1b3d;          /* Violet foncé */
  --chat-bg-secondary: #3a2250;        /* Violet moyen */
  --chat-bg-tertiary: #482a61;         /* Violet clair */
  --chat-bg-input: #482a61;
  --chat-bg-input-focus: #563471;
  --chat-bg-user-message: #482a61;
  --chat-bg-user-message-hover: #563471;
  
  /* Overlays - Opaques saturés */
  --chat-overlay-subtle: #3a2250;
  --chat-overlay-soft: #482a61;
  --chat-overlay-active: #563471;
  --chat-overlay-input: #482a61;
  --chat-overlay-input-focus: #563471;
  --chat-overlay-hover: #563471;
  
  /* Texte - SIMPLIFIÉ À 2 VARIABLES */
  --chat-text-primary: #e8eaed;        /* Texte principal */
  --chat-text-secondary: #bfc5cb;      /* Texte secondaire */
  
  /* Sidebar - Progression naturelle */
  --sidebar-search-overlay: #442863;   /* Barre recherche */
  --sidebar-search-overlay-focus: #50307a; /* Focus */
  --sidebar-item-hover: #5c3888;       /* Hover */
  --sidebar-item-active: #684096;      /* Active */
  
  /* Bordures - AUCUNE */
  --chat-border-subtle: transparent;
  --chat-border-soft: transparent;
  
  /* Dégradés Purple Mode - ULTRA-LISSÉS */
  --chat-gradient-block: linear-gradient(135deg, 
    #3d2552 0%, 
    #482d5f 50%, 
    #3d2552 100%);
  
  /* ✅ TOUS les éléments (sidebar incluse) utilisent le même gradient */
  --chat-gradient-input: var(--chat-gradient-block);
  --chat-gradient-sidebar: var(--chat-gradient-block);
  --chat-gradient-user: var(--chat-gradient-block);
  --chat-gradient-user-hover: linear-gradient(135deg, 
    #4a2f64 0%, 
    #563771 50%, 
    #4a2f64 100%);
  --chat-gradient-kebab: var(--chat-gradient-block);
  
  /* ✅ Surcharge directe de --blk-bg et --blk-fg pour les code blocks */
  --blk-bg: var(--chat-gradient-block);
  --blk-fg: var(--chat-text-secondary);
}

/* Sidebar purple */
body.chat-theme-purple .sidebar-ultra-clean,
body.chat-theme-purple .unified-sidebar {
  background: var(--chat-gradient-sidebar);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* Container purple */
body.chat-theme-purple .chatgpt-container {
  background: var(--chat-bg-primary);
}

/* Content et main transparents */
body.chat-theme-purple .chatgpt-content,
body.chat-theme-purple .chatgpt-main {
  background: transparent;
}

/* Header transparent */
body.chat-theme-purple .chatgpt-header {
  background: transparent;
}
```

---

## 🎨 PALETTE DE COULEURS PAR THÈME

### **Blue (référence)**
```css
Primary:   #1d3045  /* Base */
Secondary: #213241  /* +1 ton */
Tertiary:  #26384a  /* +2 tons */
Gradient:  #2d3f52 → #31445a (ultra-lissé)
```

### **Purple (exemple)**
```css
Primary:   #2d1b3d  /* Base violet foncé */
Secondary: #3a2250  /* +1 ton */
Tertiary:  #482a61  /* +2 tons */
Gradient:  #3d2552 → #482d5f (ultra-lissé)
```

### **Green (exemple)**
```css
Primary:   #1b3d2d  /* Base vert foncé */
Secondary: #225038  /* +1 ton */
Tertiary:  #2a6148  /* +2 tons */
Gradient:  #2d523f → #34604c (ultra-lissé)
```

### **Orange (exemple)**
```css
Primary:   #3d2b1b  /* Base orange foncé */
Secondary: #503a22  /* +1 ton */
Tertiary:  #61492a  /* +2 tons */
Gradient:  #523d2d → #5f4834 (ultra-lissé)
```

---

## 📐 RÈGLES D'OR POUR UN BON THÈME

### **1. Saturation cohérente**
- Toutes les couleurs doivent avoir la même intensité de saturation
- Progression harmonieuse entre Primary → Secondary → Tertiary

### **2. Dégradés ultra-lissés**
- Écart minimal entre start (0%) et milieu (50%) du gradient
- Exemple : `#2d3f52 → #31445a` (écart de ~8% luminosité max)

### **3. Hiérarchie sidebar**
```
Search (subtil) < Focus (léger) < Hover (moyen) < Active (fort)
```
Progression de ~5-8% de luminosité entre chaque état

### **4. Texte**
- Primary : Très lisible (contrast ratio > 7:1)
- Secondary : Lisible mais discret (contrast ratio > 4.5:1)

### **5. Pas de bordures**
```css
--chat-border-subtle: transparent;
--chat-border-soft: transparent;
```

### **6. Tout en gradient unifié**
```css
--chat-gradient-sidebar: var(--chat-gradient-block);  /* ✅ */
```

---

## 🧪 TESTER LE NOUVEAU THÈME

### **1. Vérifier l'isolation**
```bash
# Basculer entre thèmes
# Aucune couleur ne doit "fuiter" d'un thème à l'autre
```

### **2. Vérifier la cohérence**
- Sidebar = Même gradient que blocs ✅
- Texte lisible partout ✅
- Hiérarchie claire hover/active ✅
- Pas de bordures ✅

### **3. Vérifier la persistence**
```bash
# Refresh page → Thème doit rester
# Changer thème → localStorage doit sauvegarder
```

---

## 🚀 THÈMES RECOMMANDÉS À CRÉER

| Nom | Couleur base | Mood | Priorité |
|-----|--------------|------|----------|
| **Purple** | `#2d1b3d` | Créatif, artistique | 🔥 High |
| **Green** | `#1b3d2d` | Nature, zen | 🔥 High |
| **Orange** | `#3d2b1b` | Chaleureux, énergique | ⭐ Medium |
| **Red** | `#3d1b1b` | Intense, focus | ⭐ Medium |
| **Teal** | `#1b3d3d` | Tech, moderne | ⭐ Medium |
| **Pink** | `#3d1b2d` | Doux, accueillant | ⚡ Low |

---

## 📊 CHECKLIST NOUVEAU THÈME

- [ ] Ajouté dans `useTheme.ts` (type + config + validation)
- [ ] Bloc CSS complet dans `chat-clean.css`
- [ ] Variables primary/secondary/tertiary cohérentes
- [ ] Dégradés ultra-lissés (écart < 10%)
- [ ] Sidebar unifiée (`var(--chat-gradient-block)`)
- [ ] Hiérarchie search < focus < hover < active
- [ ] Texte primary + secondary définis
- [ ] Pas de bordures (`transparent`)
- [ ] Surcharges `.sidebar-ultra-clean`, `.chatgpt-container`, etc.
- [ ] Testé en local (isolation, persistence, lisibilité)
- [ ] Testé sur mobile + desktop
- [ ] Accessible (contrast ratio OK)

---

## 🎯 RÉSUMÉ

**Système actuel** : ✅ Production-ready, bien isolé, maintenable

**Pour créer un thème** :
1. Ajouter dans `useTheme.ts` (3 lignes)
2. Copier/adapter bloc CSS Blue (50 lignes)
3. Respecter les règles d'or (saturation, gradients, hiérarchie)
4. Tester isolation + persistence

**Effort** : ~15 min par thème ⚡

**Maintenabilité** : Excellente (tout centralisé, pas de duplication)

