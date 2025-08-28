# POLICE INTER UNIFIÉE DANS LE CHAT

## Vue d'ensemble
La police Inter est maintenant appliquée de manière cohérente à tous les composants du chat.

## Fichiers modifiés

### 1. Variables CSS centralisées
- `src/styles/chat-design-system-v2.css` - Variables de police définies
- `src/styles/chat-global.css` - Application globale de la police Inter

### 2. Composants mis à jour
- `ChatMessage.css` - Police Inter pour les messages
- `ChatMarkdown.css` - Police Inter pour le markdown
- `ChatFullscreenV2.css` - Police Inter pour le mode plein écran
- `ToolCallMessage.css` - Police Inter pour les messages d'outils
- `StreamingMessageDemo.css` - Police Inter pour les démos
- `StreamingLineByLineDemo.css` - Police Inter pour les démos

### 3. Layout principal
- `src/app/layout.tsx` - Import de la police Inter et du CSS global

## Variables CSS utilisées

```css
:root {
  --chat-font-family-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --chat-font-family-base: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --chat-font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
}
```

## Application de la police

### Sélecteurs globaux
```css
.chat-fullscreen-container,
.chat-fullscreen-container *,
.chat-widget-mode,
.chat-widget-mode *,
.chat-message,
.chat-message *,
.chat-input,
.chat-input *,
.chat-sidebar,
.chat-sidebar *,
.chat-markdown,
.chat-markdown *,
.tool-call-message,
.tool-call-message *,
.streaming-message,
.streaming-message *,
.reasoning-message,
.reasoning-message *,
.chat-bubble,
.chat-bubble *,
.chat-header,
.chat-header *,
.chat-footer,
.chat-footer *,
.chat-controls,
.chat-controls * {
  font-family: var(--chat-font-family-inter) !important;
}
```

### Exceptions pour le code
```css
.chat-markdown code,
.chat-markdown pre,
.chat-markdown .hljs,
.chat-markdown .highlight,
.tool-call-message code,
.tool-call-message pre,
.streaming-message code,
.streaming-message pre,
.chat-bubble code,
.chat-bubble pre,
.chat-input code,
.chat-input pre,
.chat-sidebar code,
.chat-sidebar pre {
  font-family: var(--chat-font-mono, 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace) !important;
}
```

## Résultat
Tous les composants du chat utilisent maintenant la police Inter de manière cohérente, avec des exceptions appropriées pour le code monospace.
