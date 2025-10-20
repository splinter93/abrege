import React, { useState } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import './BubbleButtons.css';
import { FiCopy, FiCheck, FiVolume2, FiEdit2 } from 'react-icons/fi';

interface BubbleButtonsProps {
  content: string;
  messageId?: string;
  onCopy?: () => void;
  onVoice?: () => void;
  onEdit?: () => void;
  showVoiceButton?: boolean;
  showEditButton?: boolean;
  className?: string;
}

const BubbleButtons: React.FC<BubbleButtonsProps> = ({
  content,
  messageId,
  onCopy,
  onVoice,
  onEdit,
  showVoiceButton = false,
  showEditButton = false,
  className = ''
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy text: ', err);
    }
  };

  const handleVoice = () => {
    onVoice?.();
  };

  const handleEdit = () => {
    onEdit?.();
  };

  return (
    <>
      <div className={`bubble-buttons ${className}`}>
        <div className="bubble-buttons-container">
          <button
            className={`bubble-button copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copié !' : 'Copier le message'}
            aria-label={copied ? 'Message copié' : 'Copier le message'}
          >
            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
          </button>

          {showVoiceButton && (
            <button
              className="bubble-button voice-button"
              onClick={handleVoice}
              title="Lire à haute voix"
              aria-label="Lire le message à haute voix"
            >
              <FiVolume2 size={16} />
            </button>
          )}

          {showEditButton && (
            <button
              className="bubble-button edit-button"
              onClick={handleEdit}
              title="Éditer le message"
              aria-label="Éditer le message"
            >
              <FiEdit2 size={16} />
            </button>
          )}

        </div>
      </div>
    </>
  );
};

export default BubbleButtons; 