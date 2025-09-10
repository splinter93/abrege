'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './StreamingLineByLine.css';

interface StreamingLineByLineProps {
  content: string;
  wordDelay?: number; // Délai entre chaque mot en millisecondes
  onComplete?: () => void;
  className?: string;
}

export const StreamingLineByLine: React.FC<StreamingLineByLineProps> = ({
  content,
  wordDelay = 20, // 20ms entre chaque caractère par défaut (plus fluide)
  onComplete,
  className = ''
}) => {
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!content || content.length === 0) return;

    setDisplayedContent('');
    setCurrentCharIndex(0);
    setIsComplete(false);

    const processNextChar = (charIndex: number) => {
      if (charIndex >= content.length) {
        setIsComplete(true);
        onComplete?.();
        return;
      }

      // Ajouter le caractère actuel
      setDisplayedContent(prev => prev + content[charIndex]);
      
      // Passer au caractère suivant après le délai
      setTimeout(() => {
        setCurrentCharIndex(charIndex + 1);
        processNextChar(charIndex + 1);
      }, wordDelay);
    };

    // Démarrer le processus
    processNextChar(0);

    return () => {
      // Cleanup si le composant est démonté
      setIsComplete(true);
    };
  }, [content, wordDelay, onComplete]);

  return (
    <div className={`streaming-line-by-line ${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="streaming-content"
      >
        {isComplete ? (
          <ReactMarkdown>{displayedContent}</ReactMarkdown>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {displayedContent}
            <span className="typing-cursor">|</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StreamingLineByLine; 