import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface AnimatedReasoningProps {
  reasoning: string;
  speed?: number;
  onComplete?: () => void;
}

export const AnimatedReasoning: React.FC<AnimatedReasoningProps> = ({
  reasoning,
  speed = 30, // Plus lent pour le reasoning
  onComplete
}) => {
  const [displayedReasoning, setDisplayedReasoning] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!reasoning) return;
    
    setIsAnimating(true);
    setDisplayedReasoning('');
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < reasoning.length) {
        setDisplayedReasoning(reasoning.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        onComplete?.();
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [reasoning, speed, onComplete]);

  if (!reasoning) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="animated-reasoning"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="reasoning-content"
      >
        <strong>🧠 Raisonnement :</strong>
        <div className="reasoning-text">
          {displayedReasoning}
          {isAnimating && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="typing-cursor"
            >
              |
            </motion.span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}; 