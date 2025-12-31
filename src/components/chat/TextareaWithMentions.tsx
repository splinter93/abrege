/**
 * Textarea avec mentions colorées (pattern overlay)
 * Architecture : Textarea transparent + div colorée dessous
 * Conformité : < 300 lignes, props typées strictement
 * @module components/chat/TextareaWithMentions
 */

'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';
import { simpleLogger as logger } from '@/utils/logger';

interface TextareaWithMentionsProps {
  /** Valeur du textarea */
  value: string;
  
  /** Callback onChange */
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  /** Callback onKeyDown */
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  
  /** Placeholder */
  placeholder: string;
  
  /** Ref du textarea */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  
  /** Mentions actives (pour matcher les slugs) */
  mentions: NoteMention[];
  
  /** Prompts utilisés (pour matcher les noms) */
  usedPrompts: PromptMention[];
  
  /** Classes CSS additionnelles */
  className?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Longueur maximale du texte */
  maxLength?: number;
  
  /** Attribut title pour tooltip */
  title?: string;
}

/**
 * Part de texte (normal, mention, ou prompt)
 */
interface TextPart {
  type: 'text' | 'mention' | 'prompt';
  content: string;
  mentionData?: NoteMention;
  promptData?: PromptMention;
}

/**
 * Composant textarea avec mentions colorées
 * Pattern : Overlay texte coloré sous textarea transparent
 */
const TextareaWithMentions: React.FC<TextareaWithMentionsProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  textareaRef,
  mentions,
  usedPrompts,
  className = '',
  disabled = false,
  maxLength,
  title
}) => {
  const highlightRef = useRef<HTMLDivElement>(null);
  
  /**
   * Parse le texte pour identifier les mentions ET les prompts
   * - Mentions: @slug (orange) - UNIQUEMENT celles dans mentions[]
   * - Prompts: /Nom (vert) - UNIQUEMENT ceux dans usedPrompts[]
   * 
   * ✅ REFACTO : Whitelist exacte (pas de regex générique)
   */
  const textParts = useMemo(() => {
    if (!value) {
      return [{ type: 'text' as const, content: '' }];
    }
    
    const parts: TextPart[] = [];
    
    // Trouver toutes les occurrences (prompts + mentions)
    const allMatches: Array<{ type: 'mention' | 'prompt'; index: number; length: number; content: string; mentionData?: NoteMention; promptData?: PromptMention }> = [];
    
    const isBoundaryCharacter = (character: string | undefined): boolean => {
      if (!character) {
        return true;
      }
      return !/[a-z0-9_-]/i.test(character);
    };
    
    // ✅ Détecter UNIQUEMENT les prompts stockés dans usedPrompts[]
    usedPrompts.forEach(prompt => {
      const searchPattern = `/${prompt.slug}`;
      let index = value.indexOf(searchPattern);
      
      while (index !== -1) {
        const beforeChar = index > 0 ? value[index - 1] : undefined;
        const afterChar = value[index + searchPattern.length];
        
        if (isBoundaryCharacter(afterChar) && isBoundaryCharacter(beforeChar)) {
          allMatches.push({
            type: 'prompt',
            index,
            length: searchPattern.length,
            content: searchPattern,
            promptData: prompt
          });
        }
        
        index = value.indexOf(searchPattern, index + 1);
      }
    });
    
    // ✅ Détecter UNIQUEMENT les mentions stockées dans mentions[]
    mentions.forEach(mention => {
      const searchPattern = `@${mention.slug}`;
      let index = value.indexOf(searchPattern);
      
      while (index !== -1) {
        const beforeChar = index > 0 ? value[index - 1] : undefined;
        const afterChar = value[index + searchPattern.length];
        
        if (isBoundaryCharacter(afterChar) && isBoundaryCharacter(beforeChar)) {
          allMatches.push({
            type: 'mention',
            index,
            length: searchPattern.length,
            content: searchPattern,
            mentionData: mention
          });
        }
        
        index = value.indexOf(searchPattern, index + 1);
      }
    });
    
    // Trier par position
    allMatches.sort((a, b) => a.index - b.index);
    
    // Parser le texte
    let lastIndex = 0;
    for (const item of allMatches) {
      // Texte avant
      if (item.index > lastIndex) {
        parts.push({
          type: 'text',
          content: value.substring(lastIndex, item.index)
        });
      }
      
      // Mention ou Prompt
      parts.push({
        type: item.type,
        content: item.content,
        mentionData: item.mentionData,
        promptData: item.promptData
      });
      
      lastIndex = item.index + item.length;
    }
    
    // Texte restant
    if (lastIndex < value.length) {
      parts.push({
        type: 'text',
        content: value.substring(lastIndex)
      });
    }
    
    logger.dev('[TextareaWithMentions] 📊 Texte parsé:', {
      partsCount: parts.length,
      mentionsFound: parts.filter(p => p.type === 'mention').length,
      promptsFound: parts.filter(p => p.type === 'prompt').length
    });
    
    return parts.length > 0 ? parts : [{ type: 'text' as const, content: value }];
  }, [value, mentions, usedPrompts]);
  
  /**
   * Synchroniser le scroll de l'overlay avec le textarea
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    
    if (!textarea || !highlight) return;
    
    const handleScroll = () => {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    };
    
    textarea.addEventListener('scroll', handleScroll);
    
    return () => {
      textarea.removeEventListener('scroll', handleScroll);
    };
  }, [textareaRef]);
  
  return (
    <div className="textarea-with-mentions-container">
      {/* Overlay texte coloré (dessous, z-index: 0) */}
      <div 
        ref={highlightRef}
        className="textarea-highlight-overlay"
        aria-hidden="true"
      >
        <div className="textarea-highlight-content">
          {textParts.map((part, index) => {
            if (part.type === 'mention') {
              return (
                <span 
                  key={`mention-${index}`}
                  className="textarea-mention-highlight"
                  title={`📝 ${part.mentionData?.title}\n${part.mentionData?.description || 'Pas de description'}`}
                >
                  {part.content}
                </span>
              );
            }
            if (part.type === 'prompt') {
              return (
                <span 
                  key={`prompt-${index}`}
                  className="textarea-prompt-highlight"
                  title={`🎯 ${part.promptData?.name}\n${part.promptData?.description || 'Pas de description'}`}
                >
                  {part.content}
                </span>
              );
            }
            return <span key={`text-${index}`}>{part.content}</span>;
          })}
        </div>
      </div>
      
      {/* Textarea transparent (dessus, z-index: 1) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`textarea-with-mentions-input ${className}`}
        rows={1}
        disabled={disabled}
        spellCheck={false}
        maxLength={maxLength}
        title={title}
      />
    </div>
  );
};

export default TextareaWithMentions;

