"use client";

import React from 'react';
import ClasseurBandeau from '@/components/ClasseurBandeau';

export default function TestDossiersDesignPage() {
  const mockClasseurs = [
    { id: '1', name: 'Travail', emoji: '💼', color: '#e55a2c' },
    { id: '2', name: 'Personnel', emoji: '👤', color: '#e55a2c' },
    { id: '3', name: 'Projets', emoji: '🚀', color: '#e55a2c' },
    { id: '4', name: 'Notes', emoji: '📝', color: '#e55a2c' },
  ];

  const handleSelectClasseur = (id: string) => {
    console.log('Classeur sélectionné:', id);
  };

  const handleCreateClasseur = () => {
    console.log('Création d\'un nouveau classeur');
  };

  const handleRenameClasseur = (id: string, newName: string) => {
    console.log('Renommage du classeur:', id, 'en:', newName);
  };

  const handleDeleteClasseur = (id: string) => {
    console.log('Suppression du classeur:', id);
  };

  return (
    <div className="test-page-wrapper" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '40px 20px',
      fontFamily: 'Noto Sans, sans-serif'
    }}>
      <div className="test-container" style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          color: '#f8fafc',
          textAlign: 'center',
          marginBottom: '40px',
          fontSize: '32px',
          fontWeight: '600'
        }}>
          Test du Nouveau Design des Classeurs
        </h1>

        <div className="test-section" style={{ marginBottom: '60px' }}>
          <h2 style={{
            color: '#cbd5e1',
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '500'
          }}>
            Bandeau des classeurs avec nouveau design
          </h2>
          
          {/* Container glasmorphisme pour les classeurs */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            backdropFilter: 'blur(24px)',
            padding: '24px 32px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.3) 50%, transparent 100%)'
            }} />
            
            <ClasseurBandeau
              classeurs={mockClasseurs}
              activeClasseurId="1"
              onSelectClasseur={handleSelectClasseur}
              onCreateClasseur={handleCreateClasseur}
              onRenameClasseur={handleRenameClasseur}
              onDeleteClasseur={handleDeleteClasseur}
            />
          </div>
        </div>

        <div className="test-section" style={{ marginBottom: '60px' }}>
          <h2 style={{
            color: '#cbd5e1',
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '500'
          }}>
            Container principal du contenu
          </h2>
          
          {/* Container principal pour le contenu */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '20px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(255, 255, 255, 0.02)',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '300px'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
            }} />
            
            {/* Header simulé */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '28px 32px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '28px', opacity: 0.9 }}>📁</span>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#f8fafc',
                  margin: 0
                }}>
                  Dossier Principal
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <button style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  +
                </button>
                <button style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  ⚙️
                </button>
              </div>
            </div>
            
            {/* Contenu simulé */}
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <p>Contenu du dossier principal</p>
              <p>Ici sera affiché le FolderManager avec les dossiers et notes</p>
            </div>
          </div>
        </div>

        <div className="test-info" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '16px' }}>
            Nouveau Design Implémenté
          </h3>
          <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
            <li>✅ Sidebar qui monte jusqu'en haut (top: 0)</li>
            <li>✅ Container glasmorphisme pour les classeurs</li>
            <li>✅ Container principal pour le contenu</li>
            <li>✅ Effets de lumière et ombres améliorés</li>
            <li>✅ Animations et transitions fluides</li>
            <li>✅ Design responsive et moderne</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 