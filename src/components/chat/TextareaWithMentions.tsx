/**
 * Textarea avec mentions colorées (pattern overlay)
 * Architecture : Textarea transparent + div colorée dessous
 * Conformité : < 300 lignes, props typées strictement
 * @module components/chat/TextareaWithMentions
 */

'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import type { NoteMention } from '@/types/noteMention';
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
  
  /** Mentions actives (pour matcher les titres) */
  mentions: NoteMention[];
  
  /** Classes CSS additionnelles */
  className?: string;
  
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Part de texte (normal ou mention)
 */
interface TextPart {
  type: 'text' | 'mention';
  content: string;
  mentionData?: NoteMention;
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
  className = '',
  disabled = false
}) => {
  const highlightRef = useRef<HTMLDivElement>(null);
  
  /**
   * Parse le texte pour identifier les mentions
   * Cherche les titres des mentions dans le texte
   */
  const textParts = useMemo(() => {
    if (!value || mentions.length === 0) {
      return [{ type: 'text' as const, content: value || '' }];
    }
    
    const parts: TextPart[] = [];
    let remaining = value;
    let processed = 0;
    
    // Trier mentions par position dans le texte (première occurrence)
    const sortedMentions = [...mentions].sort((a, b) => {
      const indexA = value.indexOf(a.title);
      const indexB = value.indexOf(b.title);
      return indexA - indexB;
    });
    
    sortedMentions.forEach(mention => {
      // Chercher @Titre dans le texte
      const searchPattern = `@${mention.title}`;
      const index = remaining.indexOf(searchPattern);
      
      if (index !== -1) {
        // Texte avant la mention
        if (index > 0) {
          parts.push({
            type: 'text',
            content: remaining.substring(0, index)
          });
        }
        
        // La mention elle-même (avec @)
        parts.push({
          type: 'mention',
          content: searchPattern, // @Titre
          mentionData: mention
        });
        
        // Continuer avec le reste
        remaining = remaining.substring(index + searchPattern.length);
      }
    });
    
    // Texte restant
    if (remaining) {
      parts.push({
        type: 'text',
        content: remaining
      });
    }
    
    logger.dev('[TextareaWithMentions] 📊 Texte parsé:', {
      partsCount: parts.length,
      mentionsFound: parts.filter(p => p.type === 'mention').length
    });
    
    return parts.length > 0 ? parts : [{ type: 'text' as const, content: value }];
  }, [value, mentions]);
  
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
                  title={`${part.mentionData?.title}\nSlug: ${part.mentionData?.slug}\nID: ${part.mentionData?.id}`}
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
      />
    </div>
  );
};

export default TextareaWithMentions;

