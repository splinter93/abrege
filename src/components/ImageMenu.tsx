import React, { useRef, useState, useEffect } from 'react';

const TABS = [
  { id: 'upload', label: 'Charger' },
  { id: 'url', label: 'Intégrer un lien' },
  { id: 'ai', label: "Générer avec l'IA" },
];

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

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      // 1. Demander une URL signée à l'API
      const res = await fetch(`/api/v1/note/${noteId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType: file.type }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération de l’URL S3');
      const { url } = await res.json();
      // 2. Upload direct sur S3
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Erreur lors de l’upload S3');
      // 3. Insérer l’URL publique dans l’éditeur
      const publicUrl = url.split('?')[0];
      onInsertImage(publicUrl);
      setFile(null);
      onClose();
    } catch (err: any) {
      alert('Erreur lors de l’upload de l’image : ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleUrl = () => {
    if (!url) return;
    onInsertImage(url);
    setUrl('');
    onClose();
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
              {file && <button className="image-menu-insert-btn" onClick={handleUpload}>Insérer</button>}
              <div className="image-menu-hint">La taille maximale par fichier est de 5 Mo.</div>
            </div>
          )}
          {tab === 'url' && (
            <div className="image-menu-url">
              <input type="text" placeholder="Coller une URL d'image" value={url} onChange={e => setUrl(e.target.value)} />
              <button className="image-menu-insert-btn" onClick={handleUrl} disabled={!url}>Insérer</button>
            </div>
          )}
          {tab === 'ai' && (
            <div className="image-menu-ai">
              <input type="text" placeholder="Décris l'image à générer..." value={prompt} onChange={e => setPrompt(e.target.value)} />
              <button className="image-menu-insert-btn" onClick={handleAIGenerate} disabled={!prompt || loading}>{loading ? 'Génération...' : 'Générer & insérer'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageMenu; 