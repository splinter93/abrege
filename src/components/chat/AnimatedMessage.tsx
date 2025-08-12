'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface AnimatedMessageProps {
  content: string;
  speed?: number; // caractères par seconde
  onComplete?: () => void;
}

export const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  content,
  speed = 50, // 50 caractères/seconde par défaut
  onComplete
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!content) return;
    
    setIsAnimating(true);
    setDisplayedContent('');
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        onComplete?.();
      }
    }, 1000 / speed); // Convertir la vitesse en intervalle

    return () => clearInterval(interval);
  }, [content, speed, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="animated-message"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
      >
        {displayedContent}
        {isAnimating && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="typing-cursor"
          >
            |
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
}; 