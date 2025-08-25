"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Archive, Clock, AlertCircle, FileText, Folder, RotateCcw, Trash } from 'react-feather';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedUser } from '@/types/dossiers';
import AuthGuard from '@/components/AuthGuard';
import PageLoading from '@/components/PageLoading';
import './index.css';

// Types pour les éléments de la corbeille
interface TrashItem {
  id: string;
  type: 'note' | 'folder' | 'file';
  name: string;
  deletedAt: Date;
  expiresAt: Date;
  size?: number;
  originalPath?: string;
}

export default function TrashPage() {
  return (
    <AuthGuard>
      <TrashPageContent />
    </AuthGuard>
  );
}

function TrashPageContent() {
  const { user } = useAuth();
  
  // État simulé pour la démonstration
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Simuler le chargement des éléments de la corbeille
  useEffect(() => {
    setLoading(true);
    // Simulation d'un délai de chargement
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Calculer les statistiques
  const stats = {
    total: trashItems.length,
    notes: trashItems.filter(item => item.type === 'note').length,
    folders: trashItems.filter(item => item.type === 'folder').length,
    files: trashItems.filter(item => item.type === 'file').length
  };

  // Fonctions de gestion
  const handleRestore = (id: string) => {
    // Logique de restauration
    console.log('Restaurer:', id);
  };

  const handlePermanentDelete = (id: string) => {
    // Logique de suppression définitive
    console.log('Supprimer définitivement:', id);
  };

  const handleEmptyTrash = () => {
    // Logique de vidage de la corbeille
    console.log('Vider la corbeille');
  };

  // Afficher l'état de chargement
  if (loading) {
    return <PageLoading theme="trash" message="Chargement" />;
  }

  return (
    <>
      {/* Titre de la page avec design glassmorphism uniforme */}
      <motion.section 
        className="page-title-container-glass"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="page-title-content">
          <div className="page-title-left-section">
            <div className="page-title-icon-container">
              <span className="page-title-icon">🗑️</span>
            </div>
            <div className="page-title-section">
              <h1 className="page-title">Corbeille</h1>
              <p className="page-subtitle">Gérez vos éléments supprimés et restaurez ce qui est important</p>
            </div>
          </div>
          <div className="page-title-stats">
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{stats.total}</span>
              <span className="page-title-stats-label">Total</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{stats.notes}</span>
              <span className="page-title-stats-label">Notes</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{stats.folders}</span>
              <span className="page-title-stats-label">Dossiers</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{stats.files}</span>
              <span className="page-title-stats-label">Fichiers</span>
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
        <AnimatePresence mode="wait">
          {trashItems.length === 0 ? (
            <motion.div
              key="empty"
              className="trash-empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="empty-state-icon">
                <Archive size={64} />
              </div>
              <h2 className="empty-state-title">Corbeille vide</h2>
              <p className="empty-state-description">
                Aucun élément n'a été supprimé pour le moment. 
                Les éléments supprimés apparaîtront ici.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Liste des éléments de la corbeille */}
              <div className="trash-items-list">
                {trashItems.map((item) => (
                  <TrashItemCard
                    key={item.id}
                    item={item}
                    onRestore={handleRestore}
                    onDelete={handlePermanentDelete}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
  item: TrashItem; 
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