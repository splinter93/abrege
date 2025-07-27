import React, { useRef, useState, useEffect } from 'react';

const TABS = [
  { id: 'upload', label: 'Charger' },
  { id: 'url', label: 'Intégrer un lien' },
  { id: 'ai', label: "Générer avec l'IA" },
];

// Types d'erreurs (pour usage futur)
// interface UploadError {
//   code: string;
//   message: string;
// }

interface ImageMenuProps {
  open: boolean;
  onClose: () => void;
  onInsertImage: (src: string) => void;
  noteId: string;
  userId: string;
}

const ImageMenu: React.FC<ImageMenuProps> = ({ open, onClose, onInsertImage, noteId, userId }) => {
  const [tab, setTab] = useState<'upload' | 'url' | 'ai'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc, true);
    };
  }, [open, onClose]);

  // Reset error when tab changes
  useEffect(() => {
    setError(null);
  }, [tab]);

  if (!open) return null;

  const validateFile = (file: File): string | null => {
    // Vérifier la taille (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return `Fichier trop volumineux. Taille max: 5MB`;
    }

    // Vérifier le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return `Type de fichier non supporté. Types autorisés: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setFile(f);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Générer une clé unique pour le fichier
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      
      // 1. Demander une URL signée à l'API
      const res = await fetch(`/api/v1/note/${noteId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName, 
          fileType: file.type,
          fileSize: file.size 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la génération de l\'URL S3');
      }
      
      const { url, publicUrl } = await res.json();
      
      // 2. Upload direct sur S3
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!uploadRes.ok) {
        throw new Error('Erreur lors de l\'upload S3');
      }
      
      // 3. Insérer l'URL publique dans l'éditeur
      onInsertImage(publicUrl);
      setFile(null);
      onClose();
      
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Upload error:', err);
      }
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const handleUrl = () => {
    if (!url) return;
    
    // Validation basique de l'URL
    try {
      new URL(url);
      onInsertImage(url);
      setUrl('');
      onClose();
    } catch {
      setError('URL invalide');
    }
  };

  const handleAIGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setTimeout(() => {
      onInsertImage('https://source.unsplash.com/400x200/?' + encodeURIComponent(prompt));
      setPrompt('');
      setLoading(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="image-menu-backdrop">
      <div className="image-menu-modal" ref={modalRef} onMouseDown={e => e.stopPropagation()}>
        <div className="image-menu-tabs">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id as 'upload' | 'url' | 'ai')}>{t.label}</button>
          ))}
        </div>
        <div className="image-menu-content">
          {tab === 'upload' && (
            <div className="image-menu-upload">
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <button className="image-menu-upload-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                {file ? file.name : 'Charger un fichier'}
              </button>
              {file && <button className="image-menu-insert-btn" onClick={handleUpload} disabled={loading}>
                {loading ? 'Upload en cours...' : 'Insérer'}
              </button>}
              <div className="image-menu-hint">La taille maximale par fichier est de 5 Mo.</div>
              {error && <div className="image-menu-error">{error}</div>}
            </div>
          )}
          
          {tab === 'url' && (
            <div className="image-menu-url">
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrl()}
              />
              <button onClick={handleUrl} disabled={!url || loading}>
                {loading ? 'Chargement...' : 'Insérer'}
              </button>
              {error && <div className="image-menu-error">{error}</div>}
            </div>
          )}
          
          {tab === 'ai' && (
            <div className="image-menu-ai">
              <input
                type="text"
                placeholder="Décrivez l'image que vous voulez..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAIGenerate()}
              />
              <button onClick={handleAIGenerate} disabled={!prompt || loading}>
                {loading ? 'Génération...' : 'Générer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageMenu; 