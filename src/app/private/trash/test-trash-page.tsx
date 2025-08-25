"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Archive, Clock, AlertCircle, FileText, Folder, RotateCcw, Trash } from 'react-feather';
import PageLoading from '@/components/PageLoading';

// Composant de test pour la page corbeille
export default function TestTrashPage() {
  // Données de test
  const testTrashItems = [
    {
      id: '1',
      type: 'note' as const,
      name: 'Note de test importante',
      deletedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Il y a 1 jour
      expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000), // Dans 29 jours
      size: 1024,
      originalPath: '/Mes Classeurs/Notes importantes'
    },
    {
      id: '2',
      type: 'folder' as const,
      name: 'Dossier projet',
      deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // Dans 28 jours
      originalPath: '/Mes Classeurs/Projets'
    },
    {
      id: '3',
      type: 'file' as const,
      name: 'document.pdf',
      deletedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // Il y a 12 heures
      expiresAt: new Date(Date.now() + 29.5 * 24 * 60 * 60 * 1000), // Dans 29.5 jours
      size: 2048576, // 2MB
      originalPath: '/Mes Fichiers/Documents'
    }
  ];

  // Calculer les statistiques
  const stats = {
    total: testTrashItems.length,
    notes: testTrashItems.filter(item => item.type === 'note').length,
    folders: testTrashItems.filter(item => item.type === 'folder').length,
    files: testTrashItems.filter(item => item.type === 'file').length
  };

  // Fonctions de gestion
  const handleRestore = (id: string) => {
    console.log('🔄 Restaurer:', id);
    alert(`Restauration de l'élément ${id}`);
  };

  const handlePermanentDelete = (id: string) => {
    console.log('🗑️ Supprimer définitivement:', id);
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'élément ${id} ?`)) {
      alert(`Suppression définitive de l'élément ${id}`);
    }
  };

  return (
    <>
      {/* Titre de la page avec design glassmorphism uniforme */}
      <motion.section 
        className="trash-page-title-glass"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="title-content">
          <div className="title-icon-container">
            <span className="title-icon">🗑️</span>
          </div>
          <div className="title-section">
            <h1>Corbeille - Mode Test</h1>
            <p>Page de test avec données simulées pour vérifier le design</p>
          </div>
          <div className="title-stats">
            <div className="title-stats-item">
              <span className="title-stats-number">{stats.total}</span>
              <span className="title-stats-label">Total</span>
            </div>
            <div className="title-stats-item">
              <span className="title-stats-number">{stats.notes}</span>
              <span className="title-stats-label">Notes</span>
            </div>
            <div className="title-stats-item">
              <span className="title-stats-number">{stats.folders}</span>
              <span className="title-stats-label">Dossiers</span>
            </div>
            <div className="title-stats-item">
              <span className="title-stats-number">{stats.files}</span>
              <span className="title-stats-label">Fichiers</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section de contenu principal avec glassmorphism */}
      <motion.section 
        className="trash-content-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      >
        {/* Liste des éléments de la corbeille */}
        <div className="trash-items-list">
          {testTrashItems.map((item) => (
            <TrashItemCard
              key={item.id}
              item={item}
              onRestore={handleRestore}
              onDelete={handlePermanentDelete}
            />
          ))}
        </div>

        {/* Informations sur la corbeille */}
        <div className="trash-info-section">
          <div className="info-card">
            <div className="info-icon">
              <Clock size={20} />
            </div>
            <div className="info-content">
              <h3 className="info-title">Conservation automatique</h3>
              <p className="info-text">
                Les éléments supprimés sont conservés pendant 30 jours avant d'être définitivement supprimés.
              </p>
            </div>
          </div>
          
          <div className="info-card">
            <div className="info-icon">
              <AlertCircle size={20} />
            </div>
            <div className="info-content">
              <h3 className="info-title">Restauration possible</h3>
              <p className="info-text">
                Vous pouvez restaurer n'importe quel élément supprimé en cliquant sur le bouton "Restaurer".
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </>
  );
}

// Composant pour afficher un élément de la corbeille
function TrashItemCard({ 
  item, 
  onRestore, 
  onDelete 
}: { 
  item: any; 
  onRestore: (id: string) => void; 
  onDelete: (id: string) => void; 
}) {
  const getIcon = () => {
    switch (item.type) {
      case 'note':
        return <FileText size={20} />;
      case 'folder':
        return <Folder size={20} />;
      case 'file':
        return <FileText size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const getTypeLabel = () => {
    switch (item.type) {
      case 'note':
        return 'Note';
      case 'folder':
        return 'Dossier';
      case 'file':
        return 'Fichier';
      default:
        return 'Élément';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDaysUntilExpiry = () => {
    const now = new Date();
    const diffTime = item.expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      className="trash-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="trash-item-content">
        <div className="trash-item-icon">
          {getIcon()}
        </div>
        <div className="trash-item-details">
          <h4 className="trash-item-name">{item.name}</h4>
          <p className="trash-item-type">{getTypeLabel()}</p>
          <p className="trash-item-date">
            Supprimé le {formatDate(item.deletedAt)}
          </p>
          <p className="trash-item-expiry">
            Expire dans {getDaysUntilExpiry()} jour{getDaysUntilExpiry() > 1 ? 's' : ''}
          </p>
          {item.size && (
            <p className="trash-item-size">
              Taille : {formatSize(item.size)}
            </p>
          )}
          {item.originalPath && (
            <p className="trash-item-path">
              Chemin : {item.originalPath}
            </p>
          )}
        </div>
        <div className="trash-item-actions">
          <button
            className="trash-action-btn restore-btn"
            onClick={() => onRestore(item.id)}
            title="Restaurer"
          >
            <RotateCcw size={16} />
            <span>Restaurer</span>
          </button>
          <button
            className="trash-action-btn delete-btn"
            onClick={() => onDelete(item.id)}
            title="Supprimer définitivement"
          >
            <Trash size={16} />
            <span>Supprimer</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
} 