/**
 * Hook pour gérer les états UI locaux de ChatFullscreenV2
 * Extrait de ChatFullscreenV2.tsx (lignes 90, 167-168, 197-198, 600-610, 876-890)
 * 
 * Responsabilités:
 * - États UI locaux (sidebar, editing, canva, keyboard)
 * - Refs (textarea, previousSessionId, messagesContainer)
 * - Logique de layout (mainClassNames, canvaPaneStyle)
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Hook < 300 lignes, types stricts
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { StreamErrorDetails } from '@/services/streaming/StreamOrchestrator';

/**
 * Options du hook
 */
export interface UseChatFullscreenUIStateOptions {
  isDesktop: boolean;
  isCanvaOpen: boolean;
}

/**
 * Interface de retour du hook
 */
export interface UseChatFullscreenUIStateReturn {
  // États
  sidebarOpen: boolean;
  sidebarHovered: boolean;
  agentDropdownOpen: boolean;
  editingContent: string;
  canvaWidth: number;
  keyboardInset: number;
  streamError: StreamErrorDetails | null;
  lastUserMessage: { content: string | MessageContent; images?: ImageAttachment[] } | null;
  
  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  previousSessionIdRef: React.RefObject<string | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  
  // Layout
  mainClassNames: string[];
  canvaPaneStyle: React.CSSProperties | undefined;
  shouldRenderDesktopCanva: boolean;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setSidebarHovered: (hovered: boolean) => void;
  setAgentDropdownOpen: (open: boolean) => void;
  setEditingContent: (content: string) => void;
  setCanvaWidth: (width: number) => void;
  setStreamError: (error: StreamErrorDetails | null) => void;
  setLastUserMessage: (msg: { content: string | MessageContent; images?: ImageAttachment[] } | null) => void;
}

/**
 * Hook pour gérer les états UI locaux de ChatFullscreenV2
 * 
 * Groupe tous les états UI locaux, refs et logique de layout dans un seul hook
 * pour éviter la duplication et garantir la cohérence.
 * 
 * @param options - Options du hook
 * @returns États, refs, layout et actions
 */
export function useChatFullscreenUIState(
  options: UseChatFullscreenUIStateOptions
): UseChatFullscreenUIStateReturn {
  const { isDesktop, isCanvaOpen } = options;

  // 🎯 États UI locaux
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [canvaWidth, setCanvaWidth] = useState(66); // 66% par défaut
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [streamError, setStreamError] = useState<StreamErrorDetails | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<{ content: string | MessageContent; images?: ImageAttachment[] } | null>(null);

  // 🎯 Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 🎯 Keyboard inset detection (mobile)
  // Natif (Capacitor) : @capacitor/keyboard donne la hauteur réelle du clavier.
  // Web : visualViewport comme fallback.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let removeListeners: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Keyboard } = await import('@capacitor/keyboard');
          const showHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
            setKeyboardInset(info.keyboardHeight ?? 0);
          });
          const hideHandle = await Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardInset(0);
          });
          removeListeners = () => {
            showHandle.remove();
            hideHandle.remove();
          };
          return;
        }
      } catch {
        // Capacitor non dispo (SSR ou web sans plugin)
      }

      if (!('visualViewport' in window)) return;

      const handleViewportChange = () => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const heightDiff = window.innerHeight - viewport.height;
        const isKeyboardVisible = heightDiff > 120 && viewport.height < window.innerHeight;
        setKeyboardInset(isKeyboardVisible ? heightDiff : 0);
      };

      handleViewportChange();
      window.visualViewport?.addEventListener('resize', handleViewportChange);
      window.visualViewport?.addEventListener('scroll', handleViewportChange);

      removeListeners = () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      };
    })();

    return () => removeListeners?.();
  }, []);

  // 🎯 Layout logic
  const mainClassNames = useMemo(() => {
    const classes = ['chatgpt-main'];
    if (isDesktop) {
      classes.push('chatgpt-main--desktop');
    }
    if (isDesktop && isCanvaOpen) {
      classes.push('chatgpt-main--canva-open');
    }
    return classes;
  }, [isDesktop, isCanvaOpen]);

  const canvaPaneStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isDesktop) {
      return undefined;
    }
    return {
      flexBasis: isCanvaOpen ? `${canvaWidth}%` : '0%',
      width: isCanvaOpen ? `${canvaWidth}%` : '0%'
    };
  }, [isDesktop, isCanvaOpen, canvaWidth]);

  const shouldRenderDesktopCanva = isDesktop;

  return {
    // États
    sidebarOpen,
    sidebarHovered,
    agentDropdownOpen,
    editingContent,
    canvaWidth,
    keyboardInset,
    streamError,
    lastUserMessage,
    
    // Refs
    textareaRef,
    previousSessionIdRef,
    messagesContainerRef,
    
    // Layout
    mainClassNames,
    canvaPaneStyle,
    shouldRenderDesktopCanva,
    
    // Actions
    setSidebarOpen,
    setSidebarHovered,
    setAgentDropdownOpen,
    setEditingContent,
    setCanvaWidth,
    setStreamError,
    setLastUserMessage
  };
}

