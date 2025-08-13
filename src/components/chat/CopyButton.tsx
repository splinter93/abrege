'use client';
import React, { useState } from 'react';

interface CopyButtonProps {
  content: string;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ 
  content, 
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (!content || isCopying) return;
    
    setIsCopying(true);
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      
      // Reset après 2 secondes
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      // Fallback pour les navigateurs plus anciens
      try {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback de copie échoué:', fallbackError);
      }
    } finally {
      setIsCopying(false);
    }
  };

  const getIcon = () => {
    if (copied) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      );
    }
    
    if (isCopying) {
      return (
        <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          </circle>
        </svg>
      );
    }
    
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    );
  };

  const getText = () => {
    if (copied) return '';
    if (isCopying) return '';
    return '';
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isCopying || !content}
      className={`chat-copy-button ${className}`}
      title={copied ? 'Contenu copié !' : 'Copier le contenu'}
      aria-label={copied ? 'Contenu copié !' : 'Copier le contenu'}
    >
      {getIcon()}
    </button>
  );
};

export default CopyButton; 