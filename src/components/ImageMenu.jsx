import React, { useRef, useState, useEffect } from 'react';

const TABS = [
  { id: 'upload', label: 'Charger' },
  { id: 'url', label: 'Intégrer un lien' },
  { id: 'ai', label: 'Générer avec l\'IA' },
];

const ImageMenu = ({ open, onClose, onInsertImage }) => {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();
  const modalRef = useRef();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => {
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

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    // Mock upload: convert to base64 (à remplacer par upload réel)
    const reader = new FileReader();
    reader.onload = (e) => {
      onInsertImage(e.target.result);
      setFile(null);
      onClose();
    };
    reader.readAsDataURL(file);
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
    // Mock IA: image random
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
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="image-menu-content">
          {tab === 'upload' && (
            <div className="image-menu-upload">
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <button className="image-menu-upload-btn" onClick={() => fileInputRef.current.click()}>
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