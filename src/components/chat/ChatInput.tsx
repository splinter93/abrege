'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Globe, CornerUpRight, Folder, Image as ImageIcon, Search, FileText, Settings, Zap, Target, Cpu, AtSign } from 'react-feather';
import { Lightbulb } from 'lucide-react';
import { logger, LogCategory } from '@/utils/logger';
import AudioRecorder from './AudioRecorder';
import ImageSourceModal from './ImageSourceModal';
import type { ImageAttachment, MessageContent, ImageUploadStats } from '@/types/image';
import { buildMessageContent, revokeImageAttachments, convertFileToBase64 } from '@/utils/imageUtils';
import { chatImageUploadService } from '@/services/chatImageUploadService';
import '@/styles/ImageSourceModal.css';

interface ChatInputProps {
  onSend: (message: string | MessageContent, images?: ImageAttachment[]) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
  sessionId: string; // ✅ Requis pour upload S3
  currentAgentModel?: string; // Modèle actuel de l'agent (ex: "grok-4-fast-reasoning")
}

// Helper: mapper modèle → niveau reasoning
const getReasoningLevelFromModel = (model?: string): 'advanced' | 'general' | 'fast' | null => {
  if (!model) return null;
  if (model.includes('grok-4-0709')) return 'advanced';
  if (model.includes('grok-4-fast-reasoning')) return 'general';
  if (model.includes('grok-4-fast-non-reasoning')) return 'fast';
  return null;
};

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, textareaRef, disabled = false, placeholder = "Commencez à discuter...", sessionId, currentAgentModel }) => {
  const [message, setMessage] = React.useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  
  // Déterminer le niveau par défaut basé sur le modèle de l'agent
  const defaultReasoningLevel = getReasoningLevelFromModel(currentAgentModel);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showWebSearchMenu, setShowWebSearchMenu] = useState(false);
  const [showReasoningMenu, setShowReasoningMenu] = useState(false);
  const [reasoningOverride, setReasoningOverride] = useState<'advanced' | 'general' | 'fast' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // Handlers drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Vérifier si on quitte réellement le container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setUploadError('Seules les images sont acceptées');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }

    // ✅ NOUVEAU FLOW : Upload vers S3 immédiatement (avant envoi au LLM)
    for (const file of imageFiles) {
      try {
        // 1. Générer preview base64 local (affichage instantané)
        const base64 = await convertFileToBase64(file);
        
        // 2. Créer image temporaire avec base64 (pour preview)
        const tempId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tempImage: ImageAttachment = {
          id: tempId,
          file: file,
          previewUrl: base64,
          base64: base64, // Temporaire, sera remplacé par URL S3
          detail: 'auto',
          fileName: file.name,
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          size: file.size,
          addedAt: Date.now()
        };
        
        // 3. Afficher immédiatement dans l'UI
        setImages(prev => [...prev, tempImage]);
        
        // 4. Upload vers S3 en arrière-plan
        const uploadResult = await chatImageUploadService.uploadImages(
          [{ file, fileName: file.name, mimeType: file.type, size: file.size }],
          sessionId
        );
        
        if (uploadResult.success && uploadResult.images && uploadResult.images[0]) {
          const s3Image = uploadResult.images[0];
          
          // 5. Remplacer le base64 par l'URL S3
          setImages(prev => prev.map(img => 
            img.id === tempId 
              ? { ...img, base64: s3Image.url, previewUrl: s3Image.url } // URL S3 au lieu de base64
              : img
          ));
          
        } else {
          logger.error(LogCategory.API, 'Erreur upload S3:', uploadResult.error);
          setUploadError(`Erreur upload: ${file.name}`);
        }
        
      } catch (error) {
        logger.error(LogCategory.API, 'Erreur traitement image:', error);
        setUploadError(`Erreur avec ${file.name}`);
      }
    }
    
    // ✅ Focus sur la barre de saisie après le drop
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  }, [textareaRef, sessionId]);

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
      const content = buildMessageContent(message.trim() || 'Regarde cette image', images);
      
      // Envoyer le message
      onSend(content, images);
      
      // Reset l'état
      setMessage('');
      
      // Cleanup et reset des images
      if (images.length > 0) {
        revokeImageAttachments(images);
        setImages([]);
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

  const handleImageUploadError = useCallback((stats: ImageUploadStats) => {
    if (stats.errors.length > 0) {
      const errorMessages = stats.errors.map(e => e.message).join(', ');
      setUploadError(`Erreurs d'upload: ${errorMessages}`);
      
      // Auto-clear après 5 secondes
      setTimeout(() => setUploadError(null), 5000);
    }
  }, []);

  const toggleFileMenu = useCallback(() => {
    setShowFileMenu(prev => !prev);
  }, []);

  const toggleWebSearchMenu = useCallback(() => {
    setShowWebSearchMenu(prev => !prev);
  }, []);

  const toggleReasoningMenu = useCallback(() => {
    setShowReasoningMenu(prev => !prev);
  }, []);

  const handleLoadImageClick = useCallback(() => {
    setShowFileMenu(false);
    setShowImageSourceModal(true);
  }, []);

  const handleBrowseComputer = useCallback(() => {
    setShowImageSourceModal(false);
    // Ouvrir le sélecteur de fichiers
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        
        // ✅ NOUVEAU FLOW : Upload vers S3 immédiatement
        for (const file of fileArray) {
          try {
            // 1. Preview base64 local
            const base64 = await convertFileToBase64(file);
            
            // 2. Image temporaire
            const tempId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const tempImage: ImageAttachment = {
              id: tempId,
              file: file,
              previewUrl: base64,
              base64: base64,
              detail: 'auto' as const,
              fileName: file.name,
              mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              size: file.size,
              addedAt: Date.now()
            };
            
            // 3. Afficher immédiatement
            setImages(prev => [...prev, tempImage]);
            
            // 4. Upload S3 en arrière-plan
            const uploadResult = await chatImageUploadService.uploadImages(
              [{ file, fileName: file.name, mimeType: file.type, size: file.size }],
              sessionId
            );
            
            if (uploadResult.success && uploadResult.images && uploadResult.images[0]) {
              const s3Image = uploadResult.images[0];
              
              // 5. Remplacer par URL S3
              setImages(prev => prev.map(img => 
                img.id === tempId 
                  ? { ...img, base64: s3Image.url, previewUrl: s3Image.url }
                  : img
              ));
              
            } else {
              setUploadError(`Erreur upload: ${file.name}`);
            }
          } catch (error) {
            logger.error(LogCategory.API, 'Erreur:', error);
            setUploadError(`Erreur: ${file.name}`);
          }
        }
      }
    };
    input.click();
  }, [sessionId]);

  const handleBrowseFiles = useCallback(() => {
    setShowImageSourceModal(false);
    // TODO: Ouvrir modal pour chercher dans Files
    console.log('Browse Files');
  }, []);

  const handleLoadFile = useCallback(() => {
    setShowFileMenu(false);
    // TODO: Implémenter le chargement de fichier
    console.log('Load file');
  }, []);

  const handleTakePhoto = useCallback(() => {
    setShowFileMenu(false);
    // TODO: Implémenter la capture photo
    console.log('Take photo');
  }, []);

  // Handlers WebSearch
  const handleNewsSearch = useCallback(() => {
    setShowWebSearchMenu(false);
    // TODO: Implémenter la recherche News
    console.log('News search');
  }, []);

  const handleBasicSearch = useCallback(() => {
    setShowWebSearchMenu(false);
    // TODO: Implémenter Basic Search
    console.log('Basic search');
  }, []);

  const handleAdvancedSearch = useCallback(() => {
    setShowWebSearchMenu(false);
    // TODO: Implémenter Advanced Search
    console.log('Advanced search');
  }, []);

  // Handlers Reasoning
  const handleFastReasoning = useCallback(() => {
    // Si c'est le modèle par défaut, ne rien faire (pas d'override)
    setReasoningOverride(prev => (prev === 'fast' || defaultReasoningLevel === 'fast') ? null : 'fast');
    setShowReasoningMenu(false);
  }, [defaultReasoningLevel]);

  const handleGeneralReasoning = useCallback(() => {
    setReasoningOverride(prev => (prev === 'general' || defaultReasoningLevel === 'general') ? null : 'general');
    setShowReasoningMenu(false);
  }, [defaultReasoningLevel]);

  const handleAdvancedReasoning = useCallback(() => {
    setReasoningOverride(prev => (prev === 'advanced' || defaultReasoningLevel === 'advanced') ? null : 'advanced');
    setShowReasoningMenu(false);
  }, [defaultReasoningLevel]);

  // Fermer le menu fichier quand on clique ailleurs
  useEffect(() => {
    if (!showFileMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-file-menu') && !target.closest('.chatgpt-input-file')) {
        setShowFileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFileMenu]);

  // Fermer le menu websearch quand on clique ailleurs
  useEffect(() => {
    if (!showWebSearchMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-websearch-menu') && !target.closest('.chatgpt-input-websearch')) {
        setShowWebSearchMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWebSearchMenu]);

  // Fermer le menu reasoning quand on clique ailleurs
  useEffect(() => {
    if (!showReasoningMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.chat-reasoning-menu') && !target.closest('.chatgpt-input-reasoning')) {
        setShowReasoningMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReasoningMenu]);

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
    <div 
      className={`chatgpt-input-area ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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

      {/* Affichage des images attachées */}
      {images.length > 0 && (
        <div className="chat-images-preview-container">
          {images.map((img, idx) => (
            <div key={idx} className="chat-image-preview">
              <img src={img.previewUrl} alt={img.fileName || `Image ${idx + 1}`} />
              <button
                className="chat-image-preview-remove"
                onClick={() => {
                  setImages(prev => {
                    const imageToRemove = prev[idx];
                    if (imageToRemove) {
                      revokeImageAttachments([imageToRemove]);
                    }
                    return prev.filter((_, i) => i !== idx);
                  });
                }}
                aria-label="Supprimer l'image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
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
        {/* Bouton @ (Mention/Context) */}
        <button className="chatgpt-input-mention" aria-label="Mention">
          <AtSign size={18} />
        </button>

        {/* Bouton Fichier avec menu contextuel */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`chatgpt-input-file ${showFileMenu ? 'active' : ''} ${images.length > 0 ? 'has-files' : ''}`}
            aria-label="Ajouter des fichiers"
            onClick={toggleFileMenu}
            disabled={disabled || loading}
          >
            <Folder size={18} />
            {images.length > 0 && (
              <span className="chatgpt-input-file-badge">{images.length}</span>
            )}
          </button>

          {/* Menu contextuel Fichier */}
          {showFileMenu && (
            <div className="chat-file-menu">
              <button className="chat-file-menu-item" onClick={handleLoadImageClick}>
                <ImageIcon size={16} />
                <span>Charger une image</span>
              </button>
              <button className="chat-file-menu-item" onClick={handleLoadFile}>
                <Folder size={16} />
                <span>Charger un fichier</span>
              </button>
              <button className="chat-file-menu-item" onClick={handleTakePhoto}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Prendre une photo</span>
              </button>
            </div>
          )}

          {/* Modale de sélection source image */}
          <ImageSourceModal
            isOpen={showImageSourceModal}
            onClose={() => setShowImageSourceModal(false)}
            onSelectComputer={handleBrowseComputer}
            onSelectFiles={handleBrowseFiles}
          />
        </div>

        {/* WebSearch avec menu contextuel */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`chatgpt-input-websearch ${showWebSearchMenu ? 'active' : ''}`}
            aria-label="Recherche web"
            onClick={toggleWebSearchMenu}
            disabled={disabled || loading}
          >
            <Globe size={18} />
          </button>

          {/* Menu contextuel WebSearch */}
          {showWebSearchMenu && (
            <div className="chat-websearch-menu">
              <div className="chat-menu-header">Search</div>
              <button className="chat-websearch-menu-item" onClick={handleNewsSearch}>
                <FileText size={16} />
                <span>News</span>
              </button>
              <button className="chat-websearch-menu-item" onClick={handleBasicSearch}>
                <Globe size={16} />
                <span>Websearch</span>
              </button>
              <button className="chat-websearch-menu-item" onClick={handleAdvancedSearch}>
                <Search size={16} />
                <span>Deep Search</span>
              </button>
            </div>
          )}
        </div>

        {/* Reasoning avec menu contextuel */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`chatgpt-input-reasoning ${showReasoningMenu ? 'active' : ''} ${reasoningOverride ? 'override-active' : ''}`}
            aria-label="Reasoning"
            onClick={toggleReasoningMenu}
            disabled={disabled || loading}
            title={reasoningOverride ? `Override actif: ${reasoningOverride}` : 'Reasoning mode'}
          >
            <Lightbulb size={18} />
          </button>

          {/* Menu contextuel Reasoning */}
          {showReasoningMenu && (
            <div className="chat-reasoning-menu">
              <div className="chat-menu-header">Reasoning</div>
              <button 
                className={`chat-reasoning-menu-item ${(reasoningOverride === 'advanced' || (!reasoningOverride && defaultReasoningLevel === 'advanced')) ? 'selected' : ''}`}
                onClick={handleAdvancedReasoning}
                title="grok-4-0709 (Puissant, coûteux)"
              >
                <Cpu size={16} />
                <span>Advanced {defaultReasoningLevel === 'advanced' && '(Default)'}</span>
                {(reasoningOverride === 'advanced' || (!reasoningOverride && defaultReasoningLevel === 'advanced')) && <span className="checkmark">✓</span>}
              </button>
              <button 
                className={`chat-reasoning-menu-item ${(reasoningOverride === 'general' || (!reasoningOverride && defaultReasoningLevel === 'general')) ? 'selected' : ''}`}
                onClick={handleGeneralReasoning}
                title="grok-4-fast-reasoning (Équilibré)"
              >
                <Target size={16} />
                <span>General {defaultReasoningLevel === 'general' && '(Default)'}</span>
                {(reasoningOverride === 'general' || (!reasoningOverride && defaultReasoningLevel === 'general')) && <span className="checkmark">✓</span>}
              </button>
              <button 
                className={`chat-reasoning-menu-item ${(reasoningOverride === 'fast' || (!reasoningOverride && defaultReasoningLevel === 'fast')) ? 'selected' : ''}`}
                onClick={handleFastReasoning}
                title="grok-4-fast-non-reasoning (Rapide)"
              >
                <Zap size={16} />
                <span>Fast {defaultReasoningLevel === 'fast' && '(Default)'}</span>
                {(reasoningOverride === 'fast' || (!reasoningOverride && defaultReasoningLevel === 'fast')) && <span className="checkmark">✓</span>}
              </button>
            </div>
          )}
        </div>
        
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
            <CornerUpRight size={20} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput; 