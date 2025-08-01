// Composants principaux
export { default as ChatComponent } from './ChatComponent';
export { default as ChatInput } from './ChatInput';
export { default as ChatKebabMenu } from './ChatKebabMenu';
export { default as MarkdownMessage } from './MarkdownMessage';

// Hooks personnalisés
export { useChatMessages } from './useChatMessages';

// Services
export { getSynesiaResponse } from './chatService';
export type { Message, SynesiaResponse } from './chatService';

// Utilitaires
export { ChatLogger } from './chatLogger';
export type { LogMetadata } from './chatLogger'; 