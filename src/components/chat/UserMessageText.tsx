'use client';
import React, { useMemo } from 'react';
import { openImageModal } from './ImageModal';

/**
 * 🎯 Composant: UserMessageText
 * Affiche le texte user avec auto-linkify des URLs
 * Pas de markdown complet, juste la transformation des URLs en liens
 * Ouvre automatiquement les liens images dans la modale
 */

interface UserMessageTextProps {
  content: string;
}

const UserMessageText: React.FC<UserMessageTextProps> = ({ content }) => {
  const processedContent = useMemo(() => {
    // Regex pour détecter les URLs, mentions ET prompts
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /(@[^\s@]+)/g; // @suivi de caractères non-espaces
    const promptRegex = /(\/[A-ZÀ-Ýa-zà-ÿ][^\s@]*(?:\s+[^\s@]+)*?\s*)(?=@|\n|$)/g; // / + texte + espaces
    
    const parts: Array<{ type: 'text' | 'link' | 'mention' | 'prompt'; content: string }> = [];
    let lastIndex = 0;
    
    // Créer un tableau de tous les matches (URLs + mentions + prompts) avec leur position
    const allMatches: Array<{ type: 'link' | 'mention' | 'prompt'; index: number; content: string }> = [];
    
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      allMatches.push({ type: 'link', index: match.index, content: match[0] });
    }
    
    while ((match = mentionRegex.exec(content)) !== null) {
      allMatches.push({ type: 'mention', index: match.index, content: match[0] });
    }
    
    while ((match = promptRegex.exec(content)) !== null) {
      allMatches.push({ type: 'prompt', index: match.index, content: match[0] });
    }
    
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
        content: match.content
      });

      lastIndex = match.index + match.content.length;
    }

    // Ajouter le texte restant
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    return parts;
  }, [content]);

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
            <span key={index} className="user-message-mention">
              {part.content}
            </span>
          );
        }
        if (part.type === 'prompt') {
          return (
            <span key={index} className="user-message-prompt">
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

