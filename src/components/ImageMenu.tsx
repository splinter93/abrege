import React, { useState, useRef, useEffect } from 'react';
import { FiImage, FiUpload, FiLink, FiX, FiFile, FiAlertCircle } from 'react-icons/fi';
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
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      return `Fichier trop volumineux. Taille max: 8MB`;
    }
    
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return `Type non supporté (${file.type}). Formats acceptés: JPEG, PNG, GIF, WebP`;
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

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    try {
      const { data: { session } } = await import('@/supabaseClient').then(m => m.supabase.auth.getSession());
      return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    } catch {
      return {};
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    console.log('🚀 [IMAGE-MENU] Début upload:', { fileName: file.name, fileSize: file.size, noteId });
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeader();
      console.log('🔑 [IMAGE-MENU] Headers auth:', headers);
      
      // 1. Presign upload
      const presignPayload = {
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        scope: { note_ref: noteId },
        visibility_mode: 'inherit_note'
      };
      console.log('📤 [IMAGE-MENU] Presign payload:', presignPayload);
      
      const presignResponse = await fetch('/api/ui/files/presign-upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...headers 
        },
        body: JSON.stringify(presignPayload)
      });
      
      console.log('📥 [IMAGE-MENU] Presign response status:', presignResponse.status);
      
      if (!presignResponse.ok) {
        const errorData = await presignResponse.json().catch(() => ({}));
        console.error('❌ [IMAGE-MENU] Presign error:', errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'initiation de l\'upload');
      }
      
      const presignData = await presignResponse.json();
      console.log('✅ [IMAGE-MENU] Presign success:', presignData);
      
      const { upload_url, key, headers: uploadHeaders } = presignData;
      
      // 2. Upload vers S3
      console.log('🌐 [IMAGE-MENU] Upload vers S3:', upload_url);
      const s3Response = await fetch(upload_url, {
        method: 'PUT',
        headers: { 
          'Content-Type': file.type,
          ...(uploadHeaders || {})
        },
        body: file
      });
      
      console.log('📤 [IMAGE-MENU] S3 response status:', s3Response.status);
      
      if (!s3Response.ok) {
        throw new Error('Erreur lors de l\'upload vers S3');
      }
      
      // 3. Register le fichier
      const registerPayload = {
        key,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        scope: { note_ref: noteId },
        visibility_mode: 'inherit_note'
      };
      console.log('📝 [IMAGE-MENU] Register payload:', registerPayload);
      
      const registerResponse = await fetch('/api/ui/files/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...headers 
        },
        body: JSON.stringify(registerPayload)
      });
      
      console.log('📥 [IMAGE-MENU] Register response status:', registerResponse.status);
      
      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        console.error('❌ [IMAGE-MENU] Register error:', errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement du fichier');
      }
      
      const registerData = await registerResponse.json();
      console.log('✅ [IMAGE-MENU] Register success:', registerData);
      
      const { file: savedFile, signed_url } = registerData;
      
      // Utiliser l'URL canonique ou l'URL signée
      const imageUrl = savedFile.url || signed_url;
      console.log('🖼️ [IMAGE-MENU] Image URL finale:', imageUrl);
      
      onInsertImage(imageUrl);
      onClose();
      
    } catch (err) {
      console.error('❌ [IMAGE-MENU] Erreur upload image:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  const handleInsertUrl = async () => {
    if (!url.trim()) return;
    
    try {
      // Validation basique d'URL
      new URL(url);
      onInsertImage(url);
      onClose();
    } catch {
      setError('URL invalide. Veuillez entrer une URL complète (ex: https://example.com/image.jpg)');
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