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
    // Regex pour détecter les URLs (http, https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    const parts: Array<{ type: 'text' | 'link'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      // Ajouter le texte avant l'URL
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Ajouter l'URL
      parts.push({
        type: 'link',
        content: match[0]
      });

      lastIndex = match.index + match[0].length;
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
        return <span key={index}>{part.content}</span>;
      })}
    </div>
  );
};

export default UserMessageText;

