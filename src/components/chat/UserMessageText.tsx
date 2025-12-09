'use client';
import React, { useMemo } from 'react';
import { openImageModal } from './ImageModal';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';

/**
 * 🎯 Composant: UserMessageText
 * Affiche le texte user avec auto-linkify des URLs
 * Parse mentions @slug et prompts /slug depuis metadata (whitelist exacte)
 * Ouvre automatiquement les liens images dans la modale
 * 
 * ✅ REFACTO : Utilise metadata mentions[] et prompts[] (comme TextareaWithMentions)
 */

interface UserMessageTextProps {
  content: string;
  mentions?: NoteMention[];
  prompts?: PromptMention[];
}

const UserMessageText: React.FC<UserMessageTextProps> = ({ 
  content, 
  mentions = [], 
  prompts = [] 
}) => {
  const processedContent = useMemo(() => {
    // Regex pour détecter les URLs uniquement
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    const parts: Array<{ 
      type: 'text' | 'link' | 'mention' | 'prompt'; 
      content: string;
      title?: string; // Pour tooltip
    }> = [];
    let lastIndex = 0;
    
    // ✅ Créer tableau de tous les matches (URLs + mentions + prompts) avec position
    const allMatches: Array<{ 
      type: 'link' | 'mention' | 'prompt'; 
      index: number; 
      length: number;
      content: string;
      title?: string;
    }> = [];
    
    // 1️⃣ URLs (regex générique OK)
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      allMatches.push({ 
        type: 'link', 
        index: match.index, 
        length: match[0].length,
        content: match[0] 
      });
    }
    
    // 2️⃣ Mentions (whitelist depuis metadata)
    mentions.forEach(mention => {
      const searchPattern = `@${mention.slug}`;
      let index = content.indexOf(searchPattern);
      
      while (index !== -1) {
        allMatches.push({
          type: 'mention',
          index,
          length: searchPattern.length,
          content: searchPattern,
          title: (mention as { title?: string; name?: string }).title || (mention as { name?: string }).name || ''
        });
        index = content.indexOf(searchPattern, index + 1);
      }
    });
    
    // 3️⃣ Prompts (whitelist depuis metadata)
    prompts.forEach(prompt => {
      const searchPattern = `/${prompt.slug}`;
      let index = content.indexOf(searchPattern);
      
      while (index !== -1) {
        allMatches.push({
          type: 'prompt',
          index,
          length: searchPattern.length,
          content: searchPattern,
          title: prompt.name
        });
        index = content.indexOf(searchPattern, index + 1);
      }
    });
    
    // Trier par position
    allMatches.sort((a, b) => a.index - b.index);

    // Parser en respectant l'ordre
    for (const match of allMatches) {
      // Ajouter le texte avant le match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Ajouter le match (URL, mention, ou prompt)
      parts.push({
        type: match.type,
        content: match.content,
        title: match.title
      });

      lastIndex = match.index + match.length;
    }

    // Ajouter le texte restant
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    return parts;
  }, [content, mentions, prompts]);

  // 🎯 Handler pour les clics sur liens
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    // Détecter si le lien pointe vers une image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const isImageLink = imageExtensions.some(ext => 
      url.toLowerCase().endsWith(ext) || url.toLowerCase().includes(ext + '?')
    );

    if (isImageLink) {
      e.preventDefault();
      e.stopPropagation();
      openImageModal({
        src: url,
        alt: url
      });
    }
    // Sinon, laisser le comportement par défaut (ouvrir dans nouvel onglet)
  };

  return (
    <div className="chatgpt-message-text-plain">
      {processedContent.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.content}
              target="_blank"
              rel="noopener noreferrer"
              className="user-message-link"
              onClick={(e) => handleLinkClick(e, part.content)}
            >
              {part.content}
            </a>
          );
        }
        if (part.type === 'mention') {
          return (
            <span 
              key={index} 
              className="user-message-mention"
              title={part.title}
            >
              {part.content}
            </span>
          );
        }
        if (part.type === 'prompt') {
          return (
            <span 
              key={index} 
              className="user-message-prompt"
              title={part.title}
            >
              {part.content}
            </span>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </div>
  );
};

export default UserMessageText;

