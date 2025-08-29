# 🎨 Guide de Personnalisation Mermaid

## 📍 **Où modifier le design ?**

Tout le style Mermaid est maintenant centralisé dans **`src/styles/mermaid.css`** !

## 🎯 **Variables CSS principales à modifier**

### **Couleurs principales**
```css
:root {
  --mermaid-primary: #6366f1;        /* Couleur principale des nœuds */
  --mermaid-primary-light: #818cf8;  /* Version claire */
  --mermaid-primary-dark: #4f46e5;   /* Version sombre */
}
```

### **Couleurs de texte**
```css
:root {
  --mermaid-text-primary: #334155;    /* Texte principal */
  --mermaid-text-secondary: #64748b;  /* Texte secondaire */
  --mermaid-text-light: #f8fafc;     /* Texte sur fond sombre */
}
```

### **Couleurs de fond**
```css
:root {
  --mermaid-bg-primary: #ffffff;      /* Fond principal */
  --mermaid-bg-secondary: #f8fafc;   /* Fond secondaire */
  --mermaid-bg-tertiary: #f1f5f9;    /* Fond tertiaire */
}
```

### **Couleurs de bordure**
```css
:root {
  --mermaid-border-primary: #e2e8f0;   /* Bordure principale */
  --mermaid-border-secondary: #cbd5e1; /* Bordure secondaire */
  --mermaid-border-accent: #6366f1;    /* Bordure d'accent */
}
```

## 🎨 **Exemples de personnalisation**

### **Thème sombre moderne**
```css
:root {
  --mermaid-primary: #8b5cf6;
  --mermaid-bg-primary: #0f172a;
  --mermaid-bg-secondary: #1e293b;
  --mermaid-text-primary: #f1f5f9;
  --mermaid-border-primary: #334155;
}
```

### **Thème vert nature**
```css
:root {
  --mermaid-primary: #10b981;
  --mermaid-primary-light: #34d399;
  --mermaid-primary-dark: #059669;
  --mermaid-bg-secondary: #f0fdf4;
  --mermaid-border-accent: #10b981;
}
```

### **Thème bleu océan**
```css
:root {
  --mermaid-primary: #0ea5e9;
  --mermaid-primary-light: #38bdf8;
  --mermaid-primary-dark: #0284c7;
  --mermaid-bg-secondary: #f0f9ff;
  --mermaid-border-accent: #0ea5e9;
}
```

## 🔧 **Modifications avancées**

### **Changer les ombres**
```css
:root {
  --mermaid-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --mermaid-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
  --mermaid-shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.2);
}
```

### **Modifier les rayons de bordure**
```css
:root {
  --mermaid-radius-sm: 8px;
  --mermaid-radius-md: 12px;
  --mermaid-radius-lg: 16px;
}
```

### **Ajuster les espacements**
```css
:root {
  --mermaid-spacing-xs: 6px;
  --mermaid-spacing-sm: 10px;
  --mermaid-spacing-md: 14px;
  --mermaid-spacing-lg: 18px;
  --mermaid-spacing-xl: 22px;
}
```

## 🎭 **Personnalisation des types de diagrammes**

### **Flowchart (organigrammes)**
```css
.mermaid-svg-container .flowchart .node rect {
  fill: var(--mermaid-bg-secondary) !important;
  stroke: var(--mermaid-border-accent) !important;
  stroke-width: 2px !important;
  rx: var(--mermaid-radius-sm) !important;
}
```

### **Sequence (diagrammes de séquence)**
```css
.mermaid-svg-container .sequence .actor {
  fill: var(--mermaid-bg-secondary) !important;
  stroke: var(--mermaid-border-accent) !important;
  stroke-width: 2px !important;
}
```

### **Gantt (diagrammes de Gantt)**
```css
.mermaid-svg-container .gantt .bar {
  fill: var(--mermaid-primary) !important;
  stroke: var(--mermaid-primary-dark) !important;
  rx: var(--mermaid-radius-sm) !important;
}
```

## 🚀 **Workflow de modification**

1. **Ouvrir** `src/styles/mermaid.css`
2. **Modifier** les variables CSS dans `:root`
3. **Sauvegarder** le fichier
4. **Recharger** la page pour voir les changements

## 💡 **Conseils de design**

- **Contraste** : Assurez-vous que le texte reste lisible
- **Cohérence** : Utilisez la même palette de couleurs partout
- **Accessibilité** : Respectez les ratios de contraste WCAG
- **Performance** : Les variables CSS sont optimisées pour le rendu

## 🔍 **Débogage**

Si les changements ne s'appliquent pas :
1. Vérifiez que le fichier est bien sauvegardé
2. Videz le cache du navigateur
3. Vérifiez la console pour les erreurs CSS
4. Assurez-vous que le fichier est bien importé

---

**🎯 Résumé** : Tout est maintenant dans `mermaid.css` avec des variables CSS faciles à modifier !
