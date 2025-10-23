'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Globe, ArrowUp, Folder, Image as ImageIcon } from 'react-feather';
import { Lightbulb } from 'lucide-react';
import { logger, LogCategory } from '@/utils/logger';
import AudioRecorder from './AudioRecorder';
import ImageUploadZone from './ImageUploadZone';
import type { ImageAttachment, MessageContent, ImageUploadStats } from '@/types/image';
import { buildMessageContent, revokeImageAttachments } from '@/utils/imageUtils';

interface ChatInputProps {
  onSend: (message: string | MessageContent, images?: ImageAttachment[]) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, textareaRef, disabled = false, placeholder = "Commencez à discuter..." }) => {
  const [message, setMessage] = React.useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [showImageZone, setShowImageZone] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSend = () => {
    const hasContent = message.trim() || images.length > 0;
    
    logger.debug(LogCategory.API, '🚀 Tentative d\'envoi:', { 
      message: message.trim(), 
      loading, 
      disabled,
      messageLength: message.length,
      imageCount: images.length
    });
    
    if (hasContent && !loading && !disabled) {
      logger.debug(LogCategory.API, '✅ Envoi du message avec images');
      
      // Construire le contenu multi-modal si images présentes
      const content = buildMessageContent(message.trim() || 'Que vois-tu sur cette image ?', images);
      
      // Envoyer le message
      onSend(content, images);
      
      // Reset l'état
      setMessage('');
      
      // Cleanup et reset des images
      if (images.length > 0) {
        revokeImageAttachments(images);
        setImages([]);
        setShowImageZone(false);
      }
    } else {
      logger.debug(LogCategory.API, '❌ Envoi bloqué:', { 
        hasMessage: !!message.trim(), 
        hasImages: images.length > 0,
        loading, 
        disabled 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ✅ MÉMOIRE: Gérer la transcription audio avec cleanup
  const handleTranscriptionComplete = useCallback((text: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + text);
    setAudioError(null);
    
    // Focus sur le textarea pour permettre l'édition avec cleanup
    const timeoutId = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 100);
    
    // ✅ MÉMOIRE: Cleanup du timeout si le composant se démonte
    return () => clearTimeout(timeoutId);
  }, [textareaRef]);

  // Gestion des images
  const handleImagesAdd = useCallback((newImages: ImageAttachment[]) => {
    setImages(prev => [...prev, ...newImages]);
    setUploadError(null);
  }, []);

  const handleImageRemove = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        revokeImageAttachments([imageToRemove]);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handleImageUploadError = useCallback((stats: ImageUploadStats) => {
    if (stats.errors.length > 0) {
      const errorMessages = stats.errors.map(e => e.message).join(', ');
      setUploadError(`Erreurs d'upload: ${errorMessages}`);
      
      // Auto-clear après 5 secondes
      setTimeout(() => setUploadError(null), 5000);
    }
  }, []);

  const toggleImageZone = useCallback(() => {
    setShowImageZone(prev => !prev);
  }, []);

  // Cleanup des images au démontage
  useEffect(() => {
    return () => {
      if (images.length > 0) {
        revokeImageAttachments(images);
      }
    };
  }, [images]);

  // Gérer la hauteur du textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Calculate new height based on content
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 18; // min-height from CSS
      const maxHeight = 80; // max-height from CSS
      
      // Apply height with constraints
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message, textareaRef]);

  return (
    <div className="chatgpt-input-area">
      {/* Affichage des erreurs */}
      {(audioError || uploadError) && (
        <div className="chatgpt-message-error">
          <div className="chatgpt-message-bubble">
            <span className="chatgpt-message-status-icon error">
              {audioError ? '🎤' : '🖼️'}
            </span>
            <span>{audioError || uploadError}</span>
            <button 
              className="chatgpt-message-action"
              onClick={() => {
                setAudioError(null);
                setUploadError(null);
              }}
              aria-label="Fermer l'erreur"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Zone d'upload d'images (si activée) */}
      {showImageZone && (
        <ImageUploadZone
          images={images}
          onImagesAdd={handleImagesAdd}
          onImageRemove={handleImageRemove}
          onError={handleImageUploadError}
          disabled={disabled || loading}
          maxImages={10}
        />
      )}

      {/* Zone de texte principale */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="chatgpt-input-textarea"
        rows={1}
        disabled={false}
      />
      
      {/* Actions de l'input */}
      <div className="chatgpt-input-actions">
        <button 
          className={`chatgpt-input-image ${showImageZone ? 'active' : ''} ${images.length > 0 ? 'has-images' : ''}`}
          aria-label="Ajouter des images"
          onClick={toggleImageZone}
          disabled={disabled || loading}
        >
          <ImageIcon size={18} />
          {images.length > 0 && (
            <span className="chatgpt-input-image-badge">{images.length}</span>
          )}
        </button>
        <button className="chatgpt-input-speaker" aria-label="Ajouter">
          <Folder size={18} />
        </button>
        <button className="chatgpt-input-web-search" aria-label="Recherche web">
          <Globe size={18} />
        </button>
        <button className="chatgpt-input-mic" aria-label="Reasoning">
          <Lightbulb size={18} />
        </button>
        
        <div style={{ flex: 1 }}></div>
        
        <AudioRecorder 
          onTranscriptionComplete={handleTranscriptionComplete}
          onError={setAudioError}
          disabled={disabled}
        />
        
        <button 
          onClick={handleSend} 
          disabled={(!message.trim() && images.length === 0) || loading || disabled}
          className={`chatgpt-input-send ${loading ? 'loading' : ''}`}
          aria-label="Envoyer le message"
        >
          {loading ? (
            <div className="chat-input-typing-dots">
              <div className="chat-input-typing-dot"></div>
              <div className="chat-input-typing-dot"></div>
              <div className="chat-input-typing-dot"></div>
            </div>
          ) : (
            <ArrowUp size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput; 