/**
 * Hook pour gérer les prompts du chat
 * Filtre et gère les prompts disponibles pour slash commands
 * @module hooks/useChatPrompts
 */

import { useMemo } from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';

interface UseChatPromptsOptions {
  allPrompts: EditorPrompt[];
  slashQuery: string;
}

/**
 * Hook pour gérer les prompts du chat
 */
export function useChatPrompts({ allPrompts, slashQuery }: UseChatPromptsOptions) {
  
  // Filtrer les prompts pour le chat
  const chatPrompts = useMemo(() => 
    allPrompts.filter(p => 
      p.is_active && (p.context === 'chat' || p.context === 'both')
    ), [allPrompts]
  );

  // Filtrer les prompts selon la query slash
  const filteredChatPrompts = useMemo(() => {
    if (!slashQuery) return chatPrompts;
    
    return chatPrompts.filter(p => 
      p.name.toLowerCase().includes(slashQuery) ||
      p.description?.toLowerCase().includes(slashQuery) ||
      p.category?.toLowerCase().includes(slashQuery)
    );
  }, [chatPrompts, slashQuery]);

  return {
    chatPrompts,
    filteredChatPrompts
  };
}
