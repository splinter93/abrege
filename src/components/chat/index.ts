// Composants de base
export { default as ChatFullscreenV2 } from './ChatFullscreenV2';
export { default as ChatWidgetFab } from './ChatWidgetFab';
export { default as ChatWidgetRoot } from './ChatWidgetRoot';
// ChatModeToggle supprimé
// ChatSidebar supprimé - utilise SidebarUltraClean
export { default as ChatInput } from './ChatInput';
// ChatKebabMenu supprimé - composant obsolète

// Composants de rendu des messages
export { default as EnhancedMarkdownMessage } from './EnhancedMarkdownMessage';
export { default as MermaidRenderer } from '@/components/mermaid/MermaidRenderer';
// OptimizedMessage supprimé
// ToolCallMessage supprimé — remplacé par StreamTimelineRenderer
// ToolCallDebugger supprimé

// Composants d'interface
export { default as BubbleButtons } from './BubbleButtons';
export { StreamErrorDisplay } from './StreamErrorDisplay';
export type { StreamError } from './StreamErrorDisplay';

// Types et interfaces
export type { ChatMessage, ChatSession } from '../../types/chat';

// Store
export { useChatStore } from '@/store/useChatStore';

// Services
export { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
export type { MermaidBlock, TextBlock, ContentBlock } from './mermaidService';

// Validators
export * from './validators'; 