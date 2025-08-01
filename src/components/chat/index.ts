// Composants principaux
export { default as ChatComponent } from './ChatComponent';
export { default as ChatComponentWithSessions } from './ChatComponentWithSessions';
export { default as ChatInput } from './ChatInput';
export { default as ChatKebabMenu } from './ChatKebabMenu';
export { default as MarkdownMessage } from './MarkdownMessage';
export { default as EnhancedMarkdownMessage } from './EnhancedMarkdownMessage';
export { default as MermaidRenderer } from './MermaidRenderer';

// Hooks personnalisés
export { useChatMessages } from './useChatMessages';

// Services
export { getSynesiaResponse } from './chatService';
export type { Message, SynesiaResponse } from './chatService';
export { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
export type { MermaidBlock, TextBlock, ContentBlock } from './mermaidService';

// Utilitaires
export { ChatLogger } from './chatLogger';
export type { LogMetadata } from './chatLogger'; 