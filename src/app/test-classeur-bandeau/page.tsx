"use client";

import React, { useState, useEffect } from 'react';
import ClasseurBandeau from '@/components/ClasseurBandeau';

// Données de test pour les classeurs
const mockClasseurs = [
  { id: '1', name: 'Projets', emoji: '🚀', color: '#e55a2c' },
  { id: '2', name: 'Notes personnelles', emoji: '📝', color: '#2994ff' },
  { id: '3', name: 'Recherches', emoji: '🔍', color: '#f5f5f5' },
  { id: '4', name: 'Archives', emoji: '📚', color: '#a3a3a3' },
  { id: '5', name: 'Travail', emoji: '💼', color: '#bdbdbd' },
];

// Données de test pour les éléments draggables
const mockDraggableItems = [
  { id: 'folder-1', name: 'Dossier Test 1', type: 'folder', emoji: '📁' },
  { id: 'folder-2', name: 'Dossier Test 2', type: 'folder', emoji: '📁' },
  { id: 'note-1', name: 'Note Test 1', type: 'file', emoji: '📄' },
  { id: 'note-2', name: 'Note Test 2', type: 'file', emoji: '📄' },
];

export default function TestClasseurBandeauPage() {
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>('1');
  const [dropEvents, setDropEvents] = useState<Array<{timestamp: number, event: string}>>([]);

  const handleSelectClasseur = (id: string) => {
    setActiveClasseurId(id);
    console.log('Classeur sélectionné:', id);
  };

  const handleCreateClasseur = () => {
    console.log('Création d\'un nouveau classeur');
  };

  const handleRenameClasseur = (id: string, name: string) => {
    console.log('Renommage du classeur:', id, '->', name);
  };

  const handleDeleteClasseur = (id: string) => {
    console.log('Suppression du classeur:', id);
  };

  // 🔧 NOUVEAU: Écouter les événements de drop
  useEffect(() => {
    const handleDropToClasseur = (e: CustomEvent) => {
      const { classeurId, itemId, itemType } = e.detail;
      const event = `Drop ${itemType} "${itemId}" sur classeur "${classeurId}"`;
      setDropEvents(prev => [...prev, { timestamp: Date.now(), event }]);
      console.log('🎯 Drop détecté:', e.detail);
    };

    window.addEventListener('drop-to-classeur', handleDropToClasseur as EventListener);
    return () => window.removeEventListener('drop-to-classeur', handleDropToClasseur as EventListener);
  }, []);

  // Handlers pour les éléments draggables
  const handleDragStart = (e: React.DragEvent, item: typeof mockDraggableItems[0]) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: item.id,
      type: item.type
    }));
    e.dataTransfer.effectAllowed = 'move';
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
          Test du ClasseurBandeau - Drag & Drop
        </h1>

        <div className="test-section" style={{ marginBottom: '60px' }}>
          <h2 style={{
            color: '#cbd5e1',
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '500'
          }}>
            Bandeau des classeurs avec drag & drop
          </h2>
          
          <ClasseurBandeau
            classeurs={mockClasseurs}
            activeClasseurId={activeClasseurId}
            onSelectClasseur={handleSelectClasseur}
            onCreateClasseur={handleCreateClasseur}
            onRenameClasseur={handleRenameClasseur}
            onDeleteClasseur={handleDeleteClasseur}
          />
        </div>

        {/* 🔧 NOUVEAU: Section des éléments draggables */}
        <div className="test-section" style={{ marginBottom: '60px' }}>
          <h2 style={{
            color: '#cbd5e1',
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '500'
          }}>
            Éléments à déplacer (drag vers les icônes des classeurs)
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {mockDraggableItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'grab',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#f8fafc'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                <div>
                  <div style={{ fontWeight: '500' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{item.type}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#22c55e',
            fontSize: '14px'
          }}>
            💡 <strong>Instructions :</strong> Glissez un élément vers l'icône d'un classeur pour le déplacer à la racine de ce classeur
          </div>
        </div>

        {/* 🔧 NOUVEAU: Section des événements de drop */}
        <div className="test-section" style={{ marginBottom: '60px' }}>
          <h2 style={{
            color: '#cbd5e1',
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '500'
          }}>
            Événements de drop détectés
          </h2>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {dropEvents.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                Aucun événement de drop détecté
              </div>
            ) : (
              dropEvents.map((event, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                    color: '#3b82f6',
                    fontSize: '14px'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{event.event}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="test-info" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          color: '#94a3b8'
        }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '16px' }}>
            Fonctionnalités testées :
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '8px' }}>✅ Sélection des classeurs</li>
            <li style={{ marginBottom: '8px' }}>✅ Bouton de création (+)</li>
            <li style={{ marginBottom: '8px' }}>✅ Menu contextuel (clic droit)</li>
            <li style={{ marginBottom: '8px' }}>✅ Design responsive</li>
            <li style={{ marginBottom: '8px' }}>✅ Animations et transitions</li>
            <li style={{ marginBottom: '8px' }}>✅ Effets de survol</li>
            <li style={{ marginBottom: '8px' }}>🆕 <strong>Drag & Drop sur les icônes</strong></li>
            <li style={{ marginBottom: '8px' }}>🆕 <strong>Effets visuels de drop</strong></li>
            <li style={{ marginBottom: '8px' }}>🆕 <strong>Événements de drop détectés</strong></li>
          </ul>
          
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px' }}>
            <strong style={{ color: '#f97316' }}>Classeur actif :</strong> {mockClasseurs.find(c => c.id === activeClasseurId)?.name || 'Aucun'}
          </div>
        </div>
      </div>
    </div>
  );
} 