# 🚀 CodeBlock - Composant de Blocs de Code Moderne

## 📋 Vue d'ensemble

Le composant `CodeBlock` offre un rendu moderne et élégant pour les blocs de code dans le chat, avec un bouton de copie fonctionnel et un indicateur de langage.

## ✨ Fonctionnalités

### 🎨 Design Moderne
- **Fond sombre** avec effet glassmorphism
- **Bordures subtiles** avec transparence
- **Effet de flou** (backdrop-filter) pour un rendu premium
- **Coins arrondis** pour un look moderne

### 📋 Bouton de Copie
- **Position** : En haut à droite du bloc
- **Animation** : Hover avec effet de survol
- **Feedback** : Changement de couleur et texte "Copié !"
- **Accessibilité** : ARIA labels et tooltips

### 🏷️ Indicateur de Langage
- **Position** : En haut à gauche du bloc
- **Style** : Badge avec fond semi-transparent
- **Format** : Texte en majuscules avec espacement

### 🔤 Typographie de Code
- **Fonts** : JetBrains Mono, Fira Code, Cascadia Code, etc.
- **Taille** : 14px pour une lisibilité optimale
- **Couleur** : #e4e4e7 pour un contraste parfait

## 🛠️ Utilisation

### Import du Composant

```tsx
import CodeBlock from '@/components/chat/CodeBlock';
```

### Utilisation Basique

```tsx
<CodeBlock>
  {`function hello() {
  console.log("Hello, World!");
}`}
</CodeBlock>
```

### Avec Langage Spécifique

```tsx
<CodeBlock language="javascript">
  {`const greeting = "Hello, World!";
console.log(greeting);`}
</CodeBlock>
```

### Exemples de Langages Supportés

- `javascript` / `js`
- `typescript` / `ts`
- `python` / `py`
- `css`
- `html`
- `sql`
- `bash` / `shell`
- `json`
- `yaml`
- `markdown`
- `xml`

## 🎨 Styles CSS

### Classes Principales

```css
.chat-markdown-code-block          /* Container principal */
.chat-markdown-code-block .copy-button    /* Bouton de copie */
.chat-markdown-code-block .code-language-indicator  /* Indicateur de langage */
```

### Variables CSS Utilisées

```css
--accent-primary: #3b82f6;        /* Couleur primaire */
--accent-hover: #60a5fa;          /* Couleur de survol */
--chat-bg-primary: #0f0f23;       /* Fond principal du chat */
```

## 📱 Responsive Design

### Breakpoints

- **Desktop** : Padding 20px, font-size 14px
- **Tablet (≤768px)** : Padding 16px, font-size 13px
- **Mobile (≤480px)** : Padding 14px, font-size 12px

### Adaptations

- **Bouton de copie** : Taille réduite sur mobile
- **Indicateur de langage** : Police plus petite sur mobile
- **Padding** : Espacement adaptatif selon l'écran

## 🔧 Personnalisation

### Override des Styles

```css
/* Personnaliser le fond */
.chat-markdown-code-block {
  background: rgba(0, 0, 0, 0.5) !important;
}

/* Personnaliser le bouton de copie */
.chat-markdown-code-block .copy-button {
  background: #3b82f6 !important;
  color: white !important;
}
```

### Thèmes Personnalisés

```css
/* Thème clair */
.chat-markdown-code-block.light-theme {
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  border-color: rgba(0, 0, 0, 0.1);
}
```

## 🚀 Intégration avec le Chat

### Dans ChatMessage

```tsx
import CodeBlock from './CodeBlock';

const ChatMessage = ({ content }) => {
  // Détecter les blocs de code dans le markdown
  const renderCodeBlock = (code, language) => (
    <CodeBlock language={language}>
      {code}
    </CodeBlock>
  );
  
  return (
    <div className="chat-markdown">
      {/* Rendu du markdown avec CodeBlock */}
    </div>
  );
};
```

### Dans EnhancedMarkdownMessage

```tsx
import CodeBlock from './CodeBlock';

const EnhancedMarkdownMessage = ({ content }) => {
  // Remplacer les <pre><code> par CodeBlock
  const processCodeBlocks = (html) => {
    // Logique de remplacement des blocs de code
  };
  
  return (
    <div 
      className="chat-markdown"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};
```

## 🧪 Tests et Démonstration

### Composant de Démo

```tsx
import CodeBlockDemo from './CodeBlockDemo';

// Afficher la démo
<CodeBlockDemo />
```

### Tests Manuels

1. **Copie de code** : Cliquer sur le bouton "Copier"
2. **Feedback visuel** : Vérifier le changement de couleur
3. **Responsive** : Tester sur différentes tailles d'écran
4. **Accessibilité** : Vérifier les ARIA labels

## 🔍 Dépannage

### Problèmes Courants

#### Le bouton de copie ne fonctionne pas
- Vérifier que `navigator.clipboard` est disponible
- Le fallback utilise `document.execCommand` sur les anciens navigateurs

#### Styles non appliqués
- Vérifier que `ChatMarkdown.css` est importé
- Vérifier que les variables CSS sont définies

#### Problèmes de responsive
- Vérifier les media queries dans le CSS
- Tester avec les DevTools du navigateur

## 📚 Ressources

### Fonts de Code Recommandées

- **JetBrains Mono** : [https://www.jetbrains.com/lp/mono/](https://www.jetbrains.com/lp/mono/)
- **Fira Code** : [https://github.com/tonsky/FiraCode](https://github.com/tonsky/FiraCode)
- **Cascadia Code** : [https://github.com/microsoft/cascadia-code](https://github.com/microsoft/cascadia-code)

### Références CSS

- **Backdrop Filter** : [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- **CSS Variables** : [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

## 🤝 Contribution

### Améliorations Suggérées

1. **Sélection de texte** : Surligner le texte sélectionné
2. **Numérotation des lignes** : Ajouter des numéros de ligne
3. **Thèmes multiples** : Support de thèmes clairs/sombres
4. **Syntax highlighting** : Coloration syntaxique avancée
5. **Zoom** : Bouton pour agrandir le code

### Standards de Code

- **TypeScript** : Types stricts et interfaces claires
- **Accessibilité** : ARIA labels et navigation clavier
- **Performance** : Memo et optimisations React
- **Tests** : Tests unitaires et d'intégration
