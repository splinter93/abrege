"use client";

import React, { useState } from 'react';
import ClasseurBandeau from '@/components/ClasseurBandeau';

// Données de test pour les classeurs
const mockClasseurs = [
  { id: '1', name: 'Projets', emoji: '🚀', color: '#e55a2c' },
  { id: '2', name: 'Notes personnelles', emoji: '📝', color: '#2994ff' },
  { id: '3', name: 'Recherches', emoji: '🔍', color: '#f5f5f5' },
  { id: '4', name: 'Archives', emoji: '📚', color: '#a3a3a3' },
  { id: '5', name: 'Travail', emoji: '💼', color: '#bdbdbd' },
];

export default function TestClasseurBandeauPage() {
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>('1');

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
          Test du ClasseurBandeau - Nouveau Design
        </h1>

        <div className="test-section" style={{ marginBottom: '60px' }}>
          <h2 style={{
            color: '#cbd5e1',
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '500'
          }}>
            Bandeau des classeurs avec design moderne
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
          </ul>
          
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px' }}>
            <strong style={{ color: '#f97316' }}>Classeur actif :</strong> {mockClasseurs.find(c => c.id === activeClasseurId)?.name || 'Aucun'}
          </div>
        </div>
      </div>
    </div>
  );
} 