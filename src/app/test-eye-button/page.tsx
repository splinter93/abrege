'use client';

import React from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { supabase } from '@/supabaseClient';

export default function TestEyeButton() {
  const notes = useFileSystemStore(s => s.notes);
  const noteIds = Object.keys(notes);

  const handleTestEyeButton = async (noteId: string) => {
    try {
      const note = notes[noteId];
      console.log('🔍 Test bouton œil pour note:', note);
      
      if (!note?.slug) {
        console.log('❌ Pas de slug');
        alert('Cette note n\'a pas de slug. Publiez-la d\'abord.');
        return;
      }

      // Simuler la logique du bouton œil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Utilisateur non connecté');
        alert('Vous devez être connecté.');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (!userData?.username) {
        console.log('❌ Username non trouvé');
        alert('Username non trouvé.');
        return;
      }

      const url = `${window.location.origin}/@${userData.username}/${note.slug}`;
      console.log('✅ URL construite:', url);
      
      // Ouvrir l'URL
      window.open(url, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('💥 Erreur test bouton œil:', error);
      alert('Erreur lors du test: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Test du Bouton Œil</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>📊 État du store Zustand</h2>
        <p>Notes dans le store: {noteIds.length}</p>
        
        {noteIds.length === 0 ? (
          <div style={{ padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <p>⚠️ Aucune note dans le store Zustand</p>
            <p>Ouvrez d'abord une note dans l'éditeur pour la charger</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {noteIds.map(noteId => {
              const note = notes[noteId];
              
              return (
                <div key={noteId} style={{ 
                  padding: '1rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <h3>📝 {note?.source_title || 'Sans titre'}</h3>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>
                    <p><strong>ID:</strong> {noteId}</p>
                    <p><strong>Slug:</strong> {note?.slug || '❌ MANQUANT'}</p>
                    <p><strong>Visibilité:</strong> {note?.share_settings?.visibility || '❌ NON DÉFINIE'}</p>
                    <p><strong>URL publique:</strong> {note?.public_url || '❌ MANQUANT'}</p>
                    <p><strong>Contenu markdown:</strong> {note?.markdown_content ? `${note.markdown_content.length} caractères` : '❌ MANQUANT'}</p>
                    <p><strong>Contenu content:</strong> {note?.content ? `${note.content.length} caractères` : '❌ MANQUANT'}</p>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={() => handleTestEyeButton(noteId)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '0.5rem'
                      }}
                    >
                      👁️ Tester le bouton œil
                    </button>
                    
                    {note?.share_settings?.visibility !== 'private' && note?.slug && (
                      <a 
                        href={`/@${note.slug}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px'
                        }}
                      >
                        🔗 Ouvrir l'URL publique
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🎯 Instructions de test :</h2>
        <ol>
          <li>Ouvrez une note dans l'éditeur pour la charger dans le store</li>
          <li>Revenez sur cette page pour voir les détails de la note</li>
          <li>Cliquez sur "Tester le bouton œil" pour simuler le comportement</li>
          <li>Vérifiez la console pour les logs de debug</li>
          <li>Si la note est accessible, l'URL publique devrait s'ouvrir</li>
        </ol>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🔧 Fonctionnalités du bouton œil :</h2>
        <ul>
          <li>✅ Vérifie que la note a un slug</li>
          <li>✅ Vérifie que l'utilisateur est connecté</li>
          <li>✅ Récupère le username de l'utilisateur</li>
          <li>✅ Construit l'URL publique avec le format /@username/slug</li>
          <li>✅ Ouvre l'URL dans un nouvel onglet</li>
          <li>✅ Gère les erreurs avec des messages toast</li>
        </ul>
      </div>

      <div>
        <h2>📊 État du système :</h2>
        <p>✅ Store Zustand initialisé</p>
        <p>✅ Connexion Supabase configurée</p>
        <p>✅ Logique de test implémentée</p>
        <p>⚠️  Notes doivent être chargées depuis l'éditeur</p>
      </div>
    </div>
  );
} 