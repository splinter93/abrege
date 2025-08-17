'use client';

import React from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export default function TestEyeButton() {
  const notes = useFileSystemStore(s => s.notes);
  const noteIds = Object.keys(notes);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Test du Bouton Œil</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>📝 Notes disponibles :</h2>
        {noteIds.length === 0 ? (
          <p>Aucune note trouvée dans le store</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {noteIds.map(noteId => {
              const note = notes[noteId];
              return (
                <div 
                  key={noteId} 
                  style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <h3>{note?.source_title || 'Sans titre'}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    <p><strong>ID:</strong> {noteId}</p>
                    <p><strong>Slug:</strong> {note?.slug || 'Aucun slug'}</p>
                    <p><strong>Visibilité:</strong> {note?.share_settings?.visibility || 'Non définie'}</p>
                    <p><strong>URL publique:</strong> {note?.public_url || 'Aucune URL'}</p>
                  </div>
                  
                  {note?.share_settings?.visibility !== 'private' && note?.public_url && (
                    <div style={{ marginTop: '1rem' }}>
                      <a 
                        href={note.public_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px'
                        }}
                      >
                        🔗 Ouvrir l'URL publique
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🎯 Instructions de test :</h2>
        <ol>
          <li>Ouvrez une note dans l'éditeur</li>
          <li>Cliquez sur le bouton œil (👁️) dans l'en-tête</li>
          <li>Vérifiez que l'URL publique s'ouvre correctement</li>
          <li>Si la note est privée, vous devriez voir un message d'erreur</li>
        </ol>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🔧 Fonctionnalités du bouton œil :</h2>
        <ul>
          <li>✅ Vérifie que la note est accessible (visibility !== 'private')</li>
          <li>✅ Utilise l'URL publique stockée si disponible</li>
          <li>✅ Construit l'URL avec le slug si nécessaire</li>
          <li>✅ Valide l'URL avant l'ouverture</li>
          <li>✅ Gère les erreurs avec des messages toast</li>
        </ul>
      </div>

      <div>
        <h2>📊 État du système :</h2>
        <p>Le bouton œil est maintenant connecté à l'URL publique de chaque note.</p>
        <p>Il utilise le système de slugs et URLs que nous avons mis en place.</p>
      </div>
    </div>
  );
} 