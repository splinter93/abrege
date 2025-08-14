# Chat Widget - Guide d'utilisation

## Vue d'ensemble

Le système de chat widget permet d'utiliser le même chat avec deux modes d'affichage différents :
- **Mode Fullscreen** : Chat en plein écran (comme avant)
- **Mode Widget** : Chat compact en fenêtre flottante

Les deux modes utilisent exactement les mêmes composants sous-jacents, seul le CSS change pour adapter l'affichage.

## Composants disponibles

### 1. ChatWidget
Composant widget autonome avec bouton flottant.

```tsx
import { ChatWidget } from '@/components/chat';

<ChatWidget
  isOpen={true}
  onToggle={(isOpen) => console.log('Widget:', isOpen)}
  position="bottom-right"
  size="medium"
/>
```

**Props :**
- `isOpen` : État d'ouverture du widget (défaut: false)
- `onToggle` : Callback appelé lors du changement d'état
- `position` : Position du widget ('bottom-right', 'bottom-left', 'top-right', 'top-left')
- `size` : Taille du widget ('small', 'medium', 'large')

### 2. ChatModeToggle
Composant qui permet de basculer facilement entre les deux modes.

```tsx
import { ChatModeToggle } from '@/components/chat';

<ChatModeToggle
  defaultMode="fullscreen"
  widgetPosition="bottom-right"
  widgetSize="medium"
/>
```

**Props :**
- `defaultMode` : Mode par défaut ('fullscreen' ou 'widget')
- `widgetPosition` : Position du widget (même options que ChatWidget)
- `widgetSize` : Taille du widget (même options que ChatWidget)

### 3. ChatFullscreenV2
Le composant original en mode fullscreen (inchangé).

```tsx
import { ChatFullscreenV2 } from '@/components/chat';

<ChatFullscreenV2 />
```

## Fonctionnalités du Widget

### Bouton flottant
- Apparaît quand le widget est fermé
- Animation de pulsation pour attirer l'attention
- Position fixe en bas à droite par défaut

### Mode minimisé
- Le widget peut être minimisé en cliquant sur le bouton de réduction
- Devient un petit cercle avec icône de chat
- Cliquer pour rouvrir

### Responsive
- S'adapte automatiquement aux écrans mobiles
- En mode mobile, le widget prend toute la largeur disponible

### Animations
- Animation d'entrée fluide
- Transitions douces entre les états
- Effets de hover sur les boutons

## Tailles disponibles

| Taille | Largeur | Hauteur | Usage recommandé |
|--------|---------|---------|------------------|
| Small  | 320px   | 480px   | Intégration discrète |
| Medium | 400px   | 600px   | Usage général |
| Large  | 500px   | 700px   | Interface principale |

## Positions disponibles

- `bottom-right` : Bas à droite (défaut)
- `bottom-left` : Bas à gauche
- `top-right` : Haut à droite
- `top-left` : Haut à gauche

## CSS personnalisation

Le widget utilise des variables CSS pour la personnalisation :

```css
:root {
  --chat-accent-primary: #3b82f6;
  --chat-accent-hover: #2563eb;
  --chat-bg-primary: #ffffff;
  --chat-border-primary: #e5e7eb;
  --chat-text-primary: #1f2937;
  --chat-text-secondary: #6b7280;
}
```

## Exemples d'utilisation

### Intégration simple
```tsx
// Widget simple
<ChatWidget isOpen={true} />

// Avec gestion d'état
const [widgetOpen, setWidgetOpen] = useState(false);
<ChatWidget 
  isOpen={widgetOpen} 
  onToggle={setWidgetOpen} 
/>
```

### Basculement automatique
```tsx
// Basculer automatiquement en mode widget sur mobile
const isMobile = useMediaQuery('(max-width: 768px)');
<ChatModeToggle defaultMode={isMobile ? 'widget' : 'fullscreen'} />
```

### Configuration avancée
```tsx
<ChatModeToggle
  defaultMode="widget"
  widgetPosition="bottom-left"
  widgetSize="large"
/>
```

## Pages de test

- `/test-chat-widget` : Test du composant ChatWidget
- `/test-chat-toggle` : Test du composant ChatModeToggle

## Migration depuis l'ancien système

L'ancien ChatWidget a été supprimé et remplacé par ce nouveau système. Pour migrer :

1. Remplacer les imports :
```tsx
// Avant
import ChatWidget from '@/components/chat/ChatWidget';

// Après
import { ChatWidget } from '@/components/chat';
```

2. Adapter les props si nécessaire (la nouvelle API est plus simple)

3. Utiliser ChatModeToggle si vous voulez permettre le basculement entre modes

## Notes techniques

- Tous les composants utilisent les mêmes hooks et stores
- La persistance des messages fonctionne dans les deux modes
- Les tool calls et autres fonctionnalités avancées sont supportées
- Le CSS est modulaire et peut être facilement personnalisé 