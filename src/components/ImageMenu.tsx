import React, { useRef, useState, useEffect } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { supabase } from '@/supabaseClient';

const TABS = [
  { id: 'upload', label: 'Charger' },
  { id: 'url', label: 'Intégrer un lien' },
];

interface ImageMenuProps {
  open: boolean;
  onClose: () => void;
  onInsertImage: (src: string) => void;
  userId: string;
  noteId: string;
}

const ImageMenu: React.FC<ImageMenuProps> = ({ open, onClose, onInsertImage, noteId, userId }) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
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

  useEffect(() => { setError(null); }, [tab]);

  if (!open) return null;

  const validateFile = (file: File) => {
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) return `Fichier trop volumineux. Taille max: 8MB`;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) return `Type non supporté (${file.type})`;
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setFile(f);
  };

  const getAuthHeader = async () => {
    console.log('🔍 [DEBUG] Getting auth header...');
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('🔍 [DEBUG] Session result:', { hasSession: !!session, error: error?.message });
    if (error) {
      console.log('🔍 [DEBUG] Auth error:', error);
      throw error;
    }
    const token = session?.access_token;
    console.log('🔍 [DEBUG] Token:', token ? `${token.substring(0, 20)}...` : 'null');
    if (!token) throw new Error('Token manquant');
    return { Authorization: `Bearer ${token}` } as const;
  };

  const buildFileNameVariant = (originalName: string, index: number): string => {
    if (index <= 1) return originalName;
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      return `${originalName} (${index})`;
      }
    const base = originalName.slice(0, lastDotIndex);
    const ext = originalName.slice(lastDotIndex);
    return `${base} (${index})${ext}`;
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const authHeader = await getAuthHeader();
      const presignRes = await fetch('/api/v2/files/presign-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ file_name: file.name, file_type: file.type, file_size: file.size, scope: { note_ref: noteId }, visibility_mode: 'inherit_note' })
      });
      if (!presignRes.ok) throw new Error((await presignRes.json().catch(() => ({}))).error || 'Erreur presign');
      const { upload_url, key, headers } = await presignRes.json();
      const put = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type, ...(headers || {}) }, body: file });
      if (!put.ok) throw new Error("Erreur upload S3");

      let attempt = 1;
      const maxAttempts = 10;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidateName = buildFileNameVariant(file.name, attempt);
        const registerRes = await fetch('/api/v2/files/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ key, file_name: candidateName, file_type: file.type, file_size: file.size, scope: { note_ref: noteId }, visibility_mode: 'inherit_note' })
        });
        if (registerRes.ok) {
          const { file: saved, signed_url, public_control_url } = await registerRes.json();
          // Use the canonical AWS URL from the files table instead of signed_url
          // The canonical URL is already stored in files.url and is the clean URL we want
          const renderUrl = saved.url || `/api/v1/public/file/${saved.id}${saved.etag ? `?v=${saved.etag}` : ''}`;
          onInsertImage(renderUrl);
          setFile(null);
          onClose();
          break;
        }
        const errJson = await registerRes.json().catch(() => ({} as any));
        const message: string = errJson?.error || 'Erreur register';
        const isDuplicate = /duplicate key value|files_user_id_filename_key/i.test(message);
        if (isDuplicate && attempt < maxAttempts) {
          attempt += 1;
          continue;
        }
        throw new Error(message);
      }
    } catch (e: any) {
      if (process.env.NODE_ENV !== 'production') logger.error('Upload error', e);
      setError(e?.message || 'Erreur upload');
    } finally {
      setLoading(false);
    }
  };

  const handleInsertUrl = () => {
    try {
      if (!url) return;
      new URL(url);
      onInsertImage(url);
      setUrl('');
      onClose();
    } catch {
      setError('URL invalide');
    }
  };

  return (
    <div className="image-menu-backdrop">
      <div className="image-menu-modal" ref={modalRef} onMouseDown={e => e.stopPropagation()}>
        <div className="image-menu-tabs">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id as 'upload' | 'url')}>
              {t.label}
            </button>
          ))}
          <button className="image-menu-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="image-menu-content">
          {tab === 'upload' && (
            <div className="image-menu-upload">
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="image-menu-btn">
                {file ? file.name : 'Choisir un fichier'}
              </button>
              <button onClick={handleUpload} disabled={!file || loading} className="image-menu-primary">
                {loading ? 'Envoi…' : 'Insérer'}
              </button>
              {error && <div className="image-menu-error">{error}</div>}
            </div>
          )}
          {tab === 'url' && (
            <div className="image-menu-url">
              <input type="text" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
              <button onClick={handleInsertUrl} disabled={!url || loading} className="image-menu-primary">
                Insérer
              </button>
              {error && <div className="image-menu-error">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageMenu; 