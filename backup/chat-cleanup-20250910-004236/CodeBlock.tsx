'use client';
import React, { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiMaximize2 } from 'react-icons/fi';
import lowlight from '@/utils/lowlightInstance';
import '@/styles/unified-blocks.css'; // Styles unifiés pour tous les blocs

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, language }) => {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>('');

  // Appliquer la coloration syntaxique quand le composant se monte ou que le contenu change
  useEffect(() => {
    if (!language || !children) {
      setHighlightedCode(typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : 
        children?.toString() || '');
      return;
    }

    try {
      // Extraire le texte du code
      const codeText = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : 
        children?.toString() || '';
      
      // Appliquer la coloration syntaxique avec lowlight
      const result = lowlight.highlight(codeText, language);
      setHighlightedCode(result.value);
    } catch (error) {
      console.warn(`Erreur lors de la coloration syntaxique pour ${language}:`, error);
      // Fallback : utiliser le code brut
      setHighlightedCode(typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : 
        children?.toString() || '');
    }
  }, [children, language]);

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

  const handleExpand = () => {
    const codeText = typeof children === 'string' ? children : 
      Array.isArray(children) ? children.join('') : 
      children?.toString() || '';
    
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Code - ${language || 'TEXT'}</title>
          <style>
            body { 
              font-family: 'JetBrains Mono', monospace; 
              background: #1a1a1a; 
              color: #a0a0a0; 
              margin: 0; 
              padding: 20px; 
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.8;
            }
          </style>
        </head>
        <body>${codeText}</body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <div className={`code-block-wrapper ${className || ''}`}>
      {/* Toolbar unifiée - même style que Mermaid */}
      <div className="unified-block-toolbar">
        {/* Indicateur de langage à gauche */}
        <div className="toolbar-left">
          <span className="toolbar-label">
            {language ? language.toUpperCase() : 'CODE'}
          </span>
        </div>
        
        {/* Boutons d'action à droite */}
        <div className="toolbar-right">
          {/* Bouton de copie */}
          <button
            className={`toolbar-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copié !' : 'Copier le code'}
            aria-label={copied ? 'Code copié' : 'Copier le code'}
          >
            {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          </button>
          
          {/* Bouton d'agrandissement */}
          <button
            className="toolbar-btn"
            onClick={handleExpand}
            title="Agrandir le code"
            aria-label="Agrandir le code"
          >
            <FiMaximize2 size={14} />
          </button>
        </div>
      </div>
      
      {/* Contenu du code avec coloration syntaxique */}
      <div className="unified-block-content">
        <pre className="code-content">
          <code 
            className={language ? `language-${language} hljs` : ''}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
