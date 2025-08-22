"use client";

import React, { useState } from 'react';
import { uploadImageForNote } from '@/utils/fileUpload';

export default function TestDragDrop() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const imageFile = files.find(f => /^image\/(jpeg|png|gif|webp)$/.test(f.type));
    if (!imageFile) {
      alert('Veuillez déposer une image valide (JPEG, PNG, GIF, WebP)');
      return;
    }
    
    try {
      // Utiliser un noteId de test
      const { publicUrl } = await uploadImageForNote(imageFile, 'test-note-id');
      setUploadedImages(prev => [...prev, publicUrl]);
      alert(`Image uploadée avec succès: ${publicUrl}`);
    } catch (error) {
      console.error('Erreur upload:', error);
      alert(`Erreur lors de l'upload: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Test Drag & Drop d'Images</h1>
      
      <div
        style={{
          border: isDragOver ? '3px dashed #2994ff' : '3px dashed #ccc',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'rgba(41, 148, 255, 0.1)' : '#f5f5f5',
          transition: 'all 0.2s ease',
          marginBottom: '20px'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>
          {isDragOver ? '🎯 Déposez l\'image ici !' : '📁 Glissez-déposez une image ici'}
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Formats acceptés: JPEG, PNG, GIF, WebP
        </p>
      </div>

      {uploadedImages.length > 0 && (
        <div>
          <h3>Images uploadées :</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {uploadedImages.map((url, index) => (
              <div key={index} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                <img 
                  src={url} 
                  alt={`Image ${index + 1}`} 
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                />
                <div style={{ padding: '10px', fontSize: '12px', wordBreak: 'break-all' }}>
                  {url}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 