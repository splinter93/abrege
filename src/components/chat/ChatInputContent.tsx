/**
 * Contenu principal du ChatInput
 * Affiche textarea, erreurs, preview images, indicateur édition
 * @module components/chat/ChatInputContent
 */

'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, X } from 'lucide-react';
import { Feather } from 'react-feather';
import type { ImageAttachment } from '@/types/image';
import type { SelectedNote } from '@/hooks/useNotesLoader';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';
import TextareaWithMentions from './TextareaWithMentions';

interface ChatInputContentProps {
  // Textarea
  message: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // Erreurs
  audioError: string | null;
  uploadError: string | null;
  onClearErrors: () => void;
  
  // Images
  images: ImageAttachment[];
  onRemoveImage: (index: number) => void;
  
  // Notes sélectionnées (épinglage)
  selectedNotes: SelectedNote[];
  onRemoveNote: (noteId: string) => void;
  
  // Mentions légères (nouveau)
  mentions?: NoteMention[];
  onRemoveMention?: (mentionId: string) => void;
  
  // Prompts utilisés (nouveau)
  usedPrompts?: PromptMention[];
  
  // Édition
  editingMessageId: string | null | undefined;
  onCancelEdit?: () => void;
  
  // Drag & drop
  isDragging: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  
  // Camera
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  onCameraCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Children (SlashMenu)
  children?: React.ReactNode;
}

/**
 * Composant ChatInputContent
 * Contenu principal du chat input (textarea + erreurs + previews)
 * ✅ REFACTO : Mentions affichées comme badges (pattern images)
 */
const ChatInputContent: React.FC<ChatInputContentProps> = ({
  message,
  onChange,
  onKeyDown,
  placeholder,
  textareaRef,
  audioError,
  uploadError,
  onClearErrors,
  images,
  onRemoveImage,
  selectedNotes,
  onRemoveNote,
  mentions = [],
  onRemoveMention,
  usedPrompts = [],
  editingMessageId,
  onCancelEdit,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  cameraInputRef,
  onCameraCapture,
  children
}) => {
  return (
    <>
      {/* Input caché pour capture photo */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCameraCapture}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Notes sélectionnées (pills AU-DESSUS du textarea) */}
      {selectedNotes.length > 0 && (
        <div className="chat-selected-notes">
          {selectedNotes.map((note) => (
            <div key={note.id} className="chat-note-pill">
              <Feather size={14} />
              <span className="chat-note-pill-title">{note.title}</span>
              <button
                className="chat-note-pill-remove"
                onClick={() => onRemoveNote(note.id)}
                aria-label="Retirer la note"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
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
              onClick={onClearErrors}
              aria-label="Fermer l'erreur"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ✏️ Indicateur d'édition */}
      <AnimatePresence>
        {editingMessageId && (
          <motion.div 
            className="editing-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Pencil size={14} />
            <span>Modifier le message</span>
            <button 
              type="button"
              onClick={onCancelEdit}
              className="editing-cancel-btn"
              aria-label="Annuler l'édition"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Affichage des images attachées */}
      {images.length > 0 && (
        <div className="chat-images-preview-container">
          {images.map((img, idx) => (
            <div key={idx} className="chat-image-preview">
              <img src={img.previewUrl} alt={img.fileName || `Image ${idx + 1}`} />
              <button
                className="chat-image-preview-remove"
                onClick={() => onRemoveImage(idx)}
                aria-label="Supprimer l'image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zone de texte principale avec mentions colorées */}
      <div className="chatgpt-input-textarea-wrapper">
        <TextareaWithMentions
          value={message}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          textareaRef={textareaRef}
          mentions={mentions}
          usedPrompts={usedPrompts}
          className="chatgpt-input-textarea"
          disabled={false}
        />
        
        {/* Menus overlay (SlashMenu + MentionMenu) - position relative au wrapper */}
        {children}
      </div>
    </>
  );
};

export default ChatInputContent;

