import React from 'react';
import { FiCopy, FiCheck, FiShare2, FiMoreHorizontal } from 'react-icons/fi';

interface BubbleButtonsProps {
  content: string;
  messageId?: string;
  onCopy?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  className?: string;
}

const BubbleButtons: React.FC<BubbleButtonsProps> = ({
  content,
  messageId,
  onCopy,
  onShare,
  onMore,
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
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = () => {
    onShare?.();
  };

  const handleMore = () => {
    onMore?.();
  };

  return (
    <div className={`bubble-buttons ${className}`}>
      <div className="bubble-buttons-container">
        <button
          className={`bubble-button copy-button ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copié !' : 'Copier le message'}
          aria-label={copied ? 'Message copié' : 'Copier le message'}
        >
          {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          <span className="button-text">
            {copied ? 'Copié' : 'Copier'}
          </span>
        </button>

        <button
          className="bubble-button share-button"
          onClick={handleShare}
          title="Partager le message"
          aria-label="Partager le message"
        >
          <FiShare2 size={14} />
          <span className="button-text">Partager</span>
        </button>

        <button
          className="bubble-button more-button"
          onClick={handleMore}
          title="Plus d'options"
          aria-label="Plus d'options"
        >
          <FiMoreHorizontal size={14} />
          <span className="button-text">Plus</span>
        </button>
      </div>
    </div>
  );
};

export default BubbleButtons; 