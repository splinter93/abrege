// Composants principaux
export { default as ChatFullscreen } from './ChatFullscreen';
export { default as ChatWidget } from './ChatWidget';
export { default as ChatSidebar } from './ChatSidebar';
export { default as ChatInput } from './ChatInput';
export { default as ChatKebabMenu } from './ChatKebabMenu';
export { default as EnhancedMarkdownMessage } from './EnhancedMarkdownMessage';
export { default as MermaidRenderer } from './MermaidRenderer';

// Store
export { useChatStore } from '../../store/useChatStore';
export type { ChatMessage, ChatSession } from '../../store/useChatStore';

// Services
export { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
export type { MermaidBlock, TextBlock, ContentBlock } from './mermaidService'; 