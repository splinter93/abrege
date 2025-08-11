'use client';
import React, { useState } from 'react';

interface CopyButtonProps {
  content: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal' | 'icon-only';
}

const CopyButton: React.FC<CopyButtonProps> = ({ 
  content, 
  className = '', 
  size = 'medium',
  variant = 'default'
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

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-1 py-0.5 text-xs';
      case 'large':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-transparent border border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500';
      case 'icon-only':
        return 'bg-transparent border-none text-gray-400 hover:text-gray-300 p-1';
      default:
        return 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500';
    }
  };

  const getIcon = () => {
    if (copied) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      );
    }
    
    if (isCopying) {
      return (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          </circle>
        </svg>
      );
    }
    
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    );
  };

  const getText = () => {
    if (copied) return 'Copié !';
    if (isCopying) return 'Copie...';
    return variant === 'icon-only' ? '' : 'Copier';
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isCopying || !content}
      className={`
        copy-button
        inline-flex items-center gap-2
        rounded-md font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${className}
      `}
      title={copied ? 'Contenu copié !' : 'Copier le contenu'}
      aria-label={copied ? 'Contenu copié !' : 'Copier le contenu'}
    >
      {getIcon()}
      {variant !== 'icon-only' && <span>{getText()}</span>}
    </button>
  );
};

export default CopyButton; 