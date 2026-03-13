'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiUpload, FiLink, FiFolder, FiAlertCircle } from 'react-icons/fi';
import { uploadImageForNote } from '@/utils/fileUpload';
import { isTemporaryCanvaNote } from '@/utils/editorHelpers';
import { FILE_SIZE_LIMITS, ALLOWED_IMAGE_TYPES, ERROR_MESSAGES } from '@/constants/fileUpload';
import UploadModal from '@/components/UploadModal';
import ScriviaFilePicker from '@/components/chat/ScriviaFilePicker';
import './ImageMenu.css';

type TabId = 'url' | 'upload' | 'files';

interface ImageMenuProps {
  open: boolean;
  onClose: () => void;
  onInsertImage: (src: string) => void;
  userId: string;
  noteId: string;
}

const ImageMenu: React.FC<ImageMenuProps> = ({ open, onClose, onInsertImage, noteId, userId: _userId }) => {
  const [activeTab, setActiveTab] = useState<TabId>('url');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setError(null);
  }, [file, url]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setUrl('');
      setError(null);
      setDragOver(false);
      setShowFilePicker(false);
      setActiveTab('url');
    }
  }, [open]);

  const validateFile = (f: File) => {
    if (f.size > FILE_SIZE_LIMITS.MAX_IMAGE_SIZE) {
      return ERROR_MESSAGES.FILE_TOO_LARGE(FILE_SIZE_LIMITS.MAX_IMAGE_SIZE);
    }
    if (!ALLOWED_IMAGE_TYPES.includes(f.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return ERROR_MESSAGES.INVALID_TYPE(f.type, ALLOWED_IMAGE_TYPES);
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
    if (!open) return;
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!open) return;
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!open) return;
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => /^image\/(jpeg|png|gif|webp)$/.test(f.type));
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

  const readFileAsDataUrl = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Impossible de lire ce fichier'));
      reader.readAsDataURL(f);
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
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
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
      setError(err instanceof Error ? err.message : "Erreur lors du traitement de l'URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromFiles = (images: Array<{ url: string; fileName?: string }>) => {
    const first = images[0];
    if (first?.url) {
      onInsertImage(first.url);
      setShowFilePicker(false);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'url', label: 'URL', icon: <FiLink size={16} /> },
    { id: 'upload', label: 'Télécharger', icon: <FiUpload size={16} /> },
    { id: 'files', label: 'Mes fichiers', icon: <FiFolder size={16} /> },
  ];

  return (
    <>
      <UploadModal open={open} onClose={onClose} title="Insérer une image">
        <div className="image-menu">
          <div className="image-menu-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`image-menu-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="image-menu-panel">
            {activeTab === 'url' && (
              <div className="image-menu-section">
                <label className="image-menu-label">Coller l’URL de l’image</label>
                <div className="image-menu-url-row">
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="image-menu-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleInsertUrl()}
                  />
                  <button
                    type="button"
                    onClick={handleInsertUrl}
                    disabled={!url.trim() || loading}
                    className="image-menu-btn image-menu-btn-primary"
                  >
                    {loading ? 'Envoi…' : 'Insérer'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="image-menu-section">
                <label className="image-menu-label">Télécharger une image</label>
                <div
                  className={`image-menu-dropzone ${dragOver ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="image-menu-file-input"
                    onChange={handleFileChange}
                  />
                  {!file ? (
                    <>
                      <FiUpload size={28} className="image-menu-dropzone-icon" />
                      <span className="image-menu-dropzone-text">
                        Cliquez ou déposez une image
                      </span>
                      <span className="image-menu-dropzone-hint">
                        JPEG, PNG, GIF, WebP · max 8 Mo
                      </span>
                    </>
                  ) : (
                    <div className="image-menu-file-preview">
                      <span className="image-menu-file-name">{file.name}</span>
                      <span className="image-menu-file-size">{formatFileSize(file.size)}</span>
                    </div>
                  )}
                </div>
                {file && (
                  <div className="image-menu-actions">
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="image-menu-btn"
                    >
                      Changer
                    </button>
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={loading}
                      className="image-menu-btn image-menu-btn-primary"
                    >
                      {loading ? 'Envoi…' : "Insérer l'image"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="image-menu-section">
                <p className="image-menu-files-desc">
                  Parcourez vos images déjà uploadées dans les notes.
                </p>
                <button
                  type="button"
                  onClick={() => setShowFilePicker(true)}
                  className="image-menu-browse-btn"
                >
                  <FiFolder size={20} />
                  <span>Ouvrir le sélecteur de fichiers</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="image-menu-error">
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </UploadModal>

      <ScriviaFilePicker
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onSelectImages={handleSelectFromFiles}
        multiple={false}
      />
    </>
  );
};

export default ImageMenu;
