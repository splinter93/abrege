# Système de Chat Scrivia

## 📋 Vue d'ensemble

Système de chat premium avec interface moderne et fonctionnalités avancées.

## 🏗️ Architecture

### Composants principaux
- `ChatComponent` : Composant principal du chat
- `ChatInput` : Zone de saisie des messages
- `ChatKebabMenu` : Menu des options (modes de largeur)
- `MarkdownMessage` : Rendu des messages en markdown

### Hooks personnalisés
- `useChatMessages` : Gestion de l'état des messages et communication API

### Services
- `chatService` : Communication avec l'API Synesia
- `chatLogger` : Logging structuré pour le debugging

## 🎨 Fonctionnalités

### Modes de largeur
- **Mode Normal** : Container de messages à 750px
- **Mode Large** : Container de messages à 1000px
- Basculement via le kebab menu dans le header

### Interface
- Design glassmorphism moderne
- Bulles de messages épurées (pas de fond pour l'assistant)
- Bouton d'envoi avec effet glassmorphism
- Responsive design

### Accessibilité
- ARIA labels complets
- Navigation clavier (Enter/Shift+Enter)
- Rôles sémantiques appropriés

## 🚀 Utilisation

```tsx
import { ChatComponent } from '@/components/chat';

function App() {
  return <ChatComponent />;
}
```

## 🔧 Configuration

### Variables CSS
```css
:root {
  --chat-container-bg: #2a2a2a;
  --chat-header-bg: #333333;
  --chat-input-bg: #404040;
  --chat-text-color: #ffffff;
  --chat-border-color: rgba(255, 255, 255, 0.1);
  --chat-border-color-focus: rgba(102, 126, 234, 0.6);
  --chat-shadow-color: rgba(0, 0, 0, 0.3);
  --chat-button-size: 61px;
  --chat-toggle-size: 56px;
  --chat-border-radius: 22px;
  --chat-padding: 1.38rem 2.07rem;
}
```

## 📝 Logging

Le système utilise un logger structuré qui :
- Affiche les logs en développement
- Masque les logs en production
- Permet l'intégration avec des services comme Sentry

```tsx
import { ChatLogger } from '@/components/chat';

ChatLogger.error('API', error, { metadata });
ChatLogger.warn('Message', 'Warning message');
ChatLogger.info('Message', 'Info message');
```

## 🎯 Performance

- Composants optimisés avec `React.memo`
- Callbacks mémorisés avec `useCallback`
- Gestion efficace des re-renders
- Lazy loading des composants lourds

## 🔒 Sécurité

- Validation des entrées utilisateur
- Sanitisation du contenu markdown
- Gestion sécurisée des erreurs API
- Pas d'exposition de données sensibles dans les logs

## 📱 Responsive

- Adaptation automatique sur mobile
- Modes de largeur désactivés sur petit écran
- Interface optimisée pour tous les appareils 