/**
 * Menu Ask AI - Actions IA sur le texte sélectionné (version dynamique avec prompts DB)
 * @module components/editor/AskAIMenu
 */

import React, { useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useEditorPrompts } from '@/hooks/useEditorPrompts';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';
import { getIconComponent } from '@/utils/iconMapper';
import type { EditorPrompt, PromptStatus } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import './ask-ai-menu.css';

interface AskAIMenuProps {
  editor: Editor;
  selectedText: string;
  onClose: () => void;
  onExecutePrompt?: (prompt: EditorPrompt, selectedText: string) => void;
}

const AskAIMenu: React.FC<AskAIMenuProps> = ({ 
  editor, 
  selectedText,
  onClose, 
  onExecutePrompt 
}) => {
  const { user } = useAuth();
  const { prompts, loading } = useEditorPrompts(user?.id);
  const { agents } = useAgents();
  const [showAll, setShowAll] = useState(false);

  /**
   * Détermine le statut d'un prompt par rapport à son agent
   */
  const getPromptStatus = (prompt: EditorPrompt): PromptStatus => {
    if (!prompt.agent_id) return 'no-agent';
    
    const agent = agents.find((a: Agent) => a.id === prompt.agent_id);
    if (!agent) return 'agent-deleted';
    if (!agent.is_active) return 'agent-inactive';
    
    return 'ok';
  };

  /**
   * Récupère le nom de l'agent pour un prompt
   */
  const getAgentName = (prompt: EditorPrompt): string => {
    if (!prompt.agent_id) return 'Aucun agent';
    const agent = agents.find((a: Agent) => a.id === prompt.agent_id);
    return agent?.name || 'Agent inconnu';
  };

  /**
   * Gère l'exécution d'un prompt
   */
  const handleExecutePrompt = (prompt: EditorPrompt) => {
    const status = getPromptStatus(prompt);
    
    if (status !== 'ok') {
      // Ne rien faire si l'agent n'est pas disponible
      return;
    }

    if (onExecutePrompt) {
      onExecutePrompt(prompt, selectedText);
    }
    
    onClose();
  };

  /**
   * Affiche les 8 premiers prompts ou tous selon l'état showAll
   */
  const displayedPrompts = useMemo(() => {
    const activePrompts = prompts.filter(p => p.is_active);
    return showAll ? activePrompts : activePrompts.slice(0, 8);
  }, [prompts, showAll]);

  const hasMore = prompts.filter(p => p.is_active).length > 8;

  if (loading) {
    return (
      <div className="ask-ai-menu">
        <div className="ask-ai-loading">
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="ask-ai-menu">
        <div className="ask-ai-empty">
          <span>Aucun prompt disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ask-ai-menu">
      <div className="ask-ai-items">
        {displayedPrompts.map((prompt) => {
          const Icon = getIconComponent(prompt.icon);
          const status = getPromptStatus(prompt);
          const isDisabled = status !== 'ok';
          
          // Messages d'erreur selon le statut
          const tooltipMessage = {
            'no-agent': 'Aucun agent assigné',
            'agent-deleted': 'Agent supprimé - Réassignez un agent',
            'agent-inactive': 'Agent inactif'
          }[status] || '';

          return (
            <button
              key={prompt.id}
              className={`ask-ai-item ${isDisabled ? 'disabled' : ''} ${prompt.is_default ? 'system' : ''}`}
              onClick={() => handleExecutePrompt(prompt)}
              disabled={isDisabled}
              title={isDisabled ? tooltipMessage : prompt.description || prompt.name}
            >
              <Icon size={16} className="ask-ai-item-icon" />
              <span className="ask-ai-item-label">{prompt.name}</span>
              {isDisabled && (
                <span className="ask-ai-item-warning">⚠️</span>
              )}
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          className="ask-ai-show-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <FiChevronUp size={14} />
              <span>Afficher moins</span>
            </>
          ) : (
            <>
              <FiChevronDown size={14} />
              <span>Afficher plus</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default AskAIMenu;

