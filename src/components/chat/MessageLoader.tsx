import React from 'react';
import './MessageLoader.css';

/**
 * 🎯 Composant: MessageLoader
 * Indicateur de chargement pour le lazy loading des messages
 * 
 * Utilisé pour:
 * - Chargement initial des messages
 * - Infinite scroll (chargement messages plus anciens)
 * 
 * @param isLoadingMore - Si true, affiche un loader compact pour infinite scroll
 */

interface MessageLoaderProps {
  isLoadingMore?: boolean;
}

const MessageLoader: React.FC<MessageLoaderProps> = ({ isLoadingMore = false }) => {
  return (
    <div className={`message-loader ${isLoadingMore ? 'message-loader-compact' : ''}`}>
      <div className="message-loader-spinner">
        <div className="message-loader-dot"></div>
        <div className="message-loader-dot"></div>
        <div className="message-loader-dot"></div>
      </div>
      <span className="message-loader-text">
        {isLoadingMore ? 'Chargement des messages...' : 'Chargement de la conversation...'}
      </span>
    </div>
  );
};

export default MessageLoader;

