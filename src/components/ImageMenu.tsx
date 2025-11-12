import React, { useState, useRef, useEffect } from 'react';
import { FiImage, FiUpload, FiLink, FiX, FiFile, FiAlertCircle } from 'react-icons/fi';
import { uploadImageForNote } from '@/utils/fileUpload';
import { isTemporaryCanvaNote } from '@/utils/editorHelpers';
import { FILE_SIZE_LIMITS, ALLOWED_IMAGE_TYPES, ERROR_MESSAGES } from '@/constants/fileUpload';
import './ImageMenu.css';

interface ImageMenuProps {
  open: boolean;
  onClose: () => void;
  onInsertImage: (src: string) => void;
  userId: string;
  noteId: string;
}

const ImageMenu: React.FC<ImageMenuProps> = ({ open, onClose, onInsertImage, noteId, userId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    
    const handleClick = (e: MouseEvent) => {
      // Ne fermer que si on clique sur le backdrop (pas sur le modal)
      if (e.target === e.currentTarget) {
        onClose();
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    
    // Utiliser click au lieu de mousedown pour éviter les conflits
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEsc, true);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEsc, true);
    };
  }, [open, onClose]);

  useEffect(() => { 
    setError(null); 
  }, [file, url]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setUrl('');
      setError(null);
      setDragOver(false);
    }
  }, [open]);

  const validateFile = (file: File) => {
    if (file.size > FILE_SIZE_LIMITS.MAX_IMAGE_SIZE) {
      return ERROR_MESSAGES.FILE_TOO_LARGE(FILE_SIZE_LIMITS.MAX_IMAGE_SIZE);
    }
    
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return ERROR_MESSAGES.INVALID_TYPE(file.type, ALLOWED_IMAGE_TYPES);
    }
    
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    const err = validateFile(f);
    if (err) { 
      setError(err); 
      setFile(null); 
      return; 
    }
    
    setFile(f);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Ne traiter le drag & drop que si le modal est ouvert
    if (!open) return;
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Ne traiter le drag & drop que si le modal est ouvert
    if (!open) return;
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    // Ne traiter le drop que si le modal est ouvert
    if (!open) return;
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const imageFile = files.find(f => /^image\/(jpeg|png|gif|webp)$/.test(f.type));
    if (!imageFile) {
      setError('Veuillez déposer une image valide (JPEG, PNG, GIF, WebP)');
      return;
    }
    
    const err = validateFile(imageFile);
    if (err) {
      setError(err);
      return;
    }
    
    setFile(imageFile);
    setError(null);
  };



  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Impossible de lire ce fichier'));
      reader.readAsDataURL(file);
    });

  const isCanvaNote = isTemporaryCanvaNote(noteId);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      if (isCanvaNote) {
        const dataUrl = await readFileAsDataUrl(file);
        onInsertImage(dataUrl);
      } else {
        const { publicUrl } = await uploadImageForNote(file, noteId);
        onInsertImage(publicUrl);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  const handleInsertUrl = async () => {
    if (!url.trim()) return;
    
    try {
      new URL(url);
      setLoading(true);
      setError(null);

      if (isCanvaNote) {
        onInsertImage(url.trim());
      } else {
        const { publicUrl } = await uploadImageForNote(url.trim(), noteId);
        onInsertImage(publicUrl);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement de l\'URL');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!open) return null;

  return (
    <div className="image-menu-backdrop">
      <div className="image-menu-modal" ref={modalRef} onMouseDown={e => e.stopPropagation()}>
        {/* Header avec titre et bouton de fermeture */}
        <div className="image-menu-header">
          <div className="image-menu-title">
            <FiImage size={18} />
            <span>Insérer une image</span>
          </div>
          <button className="image-menu-close" onClick={onClose} aria-label="Fermer">
            <FiX size={16} />
          </button>
        </div>

        {/* Contenu principal - un seul onglet */}
        <div className="image-menu-content">
          {/* Barre d'URL en haut */}
          <div className="image-menu-url-section">
            <div className="image-menu-url-label">
              <FiLink size={16} />
              <span>URL de l'image</span>
            </div>
            <div className="image-menu-url-row">
              <input 
                type="text" 
                placeholder="https://example.com/image.jpg" 
                value={url} 
                onChange={e => setUrl(e.target.value)}
                className="image-menu-url-input"
                onKeyDown={(e) => e.key === 'Enter' && handleInsertUrl()}
              />
              
              <button 
                onClick={handleInsertUrl} 
                disabled={!url.trim() || loading} 
                className="image-menu-btn primary"
              >
                Insérer
              </button>
            </div>
          </div>

          {/* Séparateur */}
          <div className="image-menu-separator">
            <span>ou</span>
          </div>

          {/* Zone de drop en bas */}
          <div className="image-menu-upload-section">
            <div className="image-menu-upload-label">
              <FiUpload size={16} />
              <span>Télécharger une image</span>
            </div>
            
            <div 
              className={`image-menu-upload-zone ${dragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              
              {!file ? (
                <>
                  <div className="image-menu-upload-icon">
                    <FiUpload size={24} />
                  </div>
                  <div className="image-menu-upload-text">
                    Cliquez ou déposez une image ici
                  </div>
                  <div className="image-menu-upload-hint">
                    Formats supportés: JPEG, PNG, GIF, WebP • Taille max: 8MB
                  </div>
                </>
              ) : (
                <div className="image-menu-file-selected">
                  <div className="image-menu-file-icon">
                    <FiFile size={16} />
                  </div>
                  <div className="image-menu-file-info">
                    <div className="image-menu-file-name">{file.name}</div>
                    <div className="image-menu-file-size">{formatFileSize(file.size)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            {file && (
              <div className="image-menu-actions">
                <button 
                  onClick={() => setFile(null)} 
                  className="image-menu-btn"
                >
                  Changer
                </button>
                <button 
                  onClick={handleUpload} 
                  disabled={loading} 
                  className="image-menu-btn primary"
                >
                  {loading ? (
                    <>
                      <div className="image-menu-spinner" />
                      Envoi...
                    </>
                  ) : (
                    'Insérer l\'image'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="image-menu-error">
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageMenu; 