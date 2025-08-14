'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './StreamingLineByLine.css';

interface StreamingLineByLineProps {
  content: string;
  lineDelay?: number; // Délai entre chaque ligne en millisecondes
  charSpeed?: number; // Vitesse d'affichage des caractères par ligne (optionnel)
  onComplete?: () => void;
  className?: string;
}

export const StreamingLineByLine: React.FC<StreamingLineByLineProps> = ({
  content,
  lineDelay = 800, // 800ms entre chaque ligne par défaut
  charSpeed = 0, // 0 = pas d'animation caractère par caractère
  onComplete,
  className = ''
}) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Diviser le contenu en lignes
  const lines = content.split('\n').filter(line => line.trim() !== '');

  useEffect(() => {
    if (!content || lines.length === 0) return;

    setDisplayedLines([]);
    setCurrentLineIndex(0);
    setIsComplete(false);

    const processNextLine = (lineIndex: number) => {
      if (lineIndex >= lines.length) {
        setIsComplete(true);
        onComplete?.();
        return;
      }

      // Ajouter la ligne actuelle
      setDisplayedLines(prev => [...prev, lines[lineIndex]]);
      
      // Passer à la ligne suivante après le délai
      setTimeout(() => {
        setCurrentLineIndex(lineIndex + 1);
        processNextLine(lineIndex + 1);
      }, lineDelay);
    };

    // Démarrer le processus
    processNextLine(0);

    return () => {
      // Cleanup si le composant est démonté
      setIsComplete(true);
    };
  }, [content, lineDelay, onComplete]);

  // Animation d'entrée pour chaque ligne
  const lineVariants = {
    hidden: { 
      opacity: 0, 
      x: -20,
      height: 0 
    },
    visible: { 
      opacity: 1, 
      x: 0,
      height: 'auto',
      transition: {
        duration: 0.4,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <div className={`streaming-line-by-line ${className}`}>
      <AnimatePresence mode="popLayout">
        {displayedLines.map((line, index) => (
          <motion.div
            key={`line-${index}`}
            variants={lineVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="streaming-line"
            style={{
              marginBottom: index < displayedLines.length - 1 ? '8px' : '0'
            }}
          >
            <ReactMarkdown>{line}</ReactMarkdown>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Indicateur de frappe si pas encore terminé */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="streaming-typing-indicator"
        >
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="typing-cursor"
          >
            |
          </motion.span>
        </motion.div>
      )}
    </div>
  );
};

export default StreamingLineByLine; 