'use client';
import React, { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Extraire le texte du code
      const codeText = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : 
        children?.toString() || '';
      
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      
      // Reset après 2 secondes
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      // Fallback pour les navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : 
        children?.toString() || '';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <pre className={`chat-markdown-code-block ${className || ''}`}>
      {/* Bouton de copie - même style que les bubbles */}
      <button
        className={`copy-button ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        title={copied ? 'Copié !' : 'Copier le code'}
        aria-label={copied ? 'Code copié' : 'Copier le code'}
      >
        {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
      </button>
      
      {/* Indicateur de langage */}
      {language && (
        <div className="code-language-indicator">
          {language}
        </div>
      )}
      
      {/* Contenu du code */}
      <code className={language ? `language-${language}` : ''}>
        {children}
      </code>
    </pre>
  );
};

export default CodeBlock;
