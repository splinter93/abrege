"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Archive, Clock, AlertCircle, FileText, Folder, RotateCcw, Trash } from 'react-feather';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedUser } from '@/types/dossiers';
import type { TrashItem, TrashStatistics } from '@/types/supabase';
import AuthGuard from '@/components/AuthGuard';
import PageLoading from '@/components/PageLoading';
import './index.css';

export default function TrashPage() {
  return (
    <AuthGuard>
      <TrashPageContent />
    </AuthGuard>
  );
}

function TrashPageContent() {
  const { user } = useAuth();
  
  // État pour la gestion de la corbeille
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [statistics, setStatistics] = useState<TrashStatistics>({
    total: 0,
    notes: 0,
    folders: 0,
    classeurs: 0,
    files: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction stable pour charger les éléments de la corbeille
  const loadTrashItems = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { TrashService } = await import('@/services/trashService');
      const data = await TrashService.getTrashItems();
      
      setTrashItems(data.items);
      setStatistics(data.statistics);
    } catch (err) {
      console.error('Erreur chargement corbeille:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Seulement quand l'ID de l'utilisateur change

  // Charger les données au montage du composant
  useEffect(() => {
    if (user) {
      loadTrashItems();
    }
  }, [user?.id, loadTrashItems]);

  // Fonctions de gestion
  const handleRestore = async (item: TrashItem) => {
    console.log('🔄 Restauration de l\'élément:', item);
    try {
      const { TrashService } = await import('@/services/trashService');
      await TrashService.restoreItem(item.type, item.id);
      
      console.log('✅ Élément restauré avec succès');
      // Recharger la liste après restauration
      await loadTrashItems();
    } catch (err) {
      console.error('❌ Erreur restauration:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    console.log('🗑️ Suppression définitive de l\'élément:', item);
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${item.name}" ?`)) {
      console.log('❌ Suppression annulée par l\'utilisateur');
      return;
    }

    try {
      const { TrashService } = await import('@/services/trashService');
      await TrashService.permanentlyDeleteItem(item.type, item.id);
      
      console.log('✅ Élément supprimé définitivement avec succès');
      // Recharger la liste après suppression
      await loadTrashItems();
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vider complètement la corbeille ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { TrashService } = await import('@/services/trashService');
      await TrashService.emptyTrash();
      
      // Vider la liste locale
      setTrashItems([]);
      setStatistics({
        total: 0,
        notes: 0,
        folders: 0,
        classeurs: 0,
        files: 0
      });
    } catch (err) {
      console.error('Erreur vidage corbeille:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du vidage de la corbeille');
    }
  };

  // Afficher l'état de chargement
  if (loading) {
    return <PageLoading theme="trash" message="Chargement de la corbeille..." />;
  }

  // Afficher l'erreur si elle existe
  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={loadTrashItems} className="retry-button">
            Réessayer
          </button>
        </div>
      </div>
    );
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
              <span className="page-title-stats-number">{statistics.total}</span>
              <span className="page-title-stats-label">Total</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{statistics.notes}</span>
              <span className="page-title-stats-label">Notes</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{statistics.folders}</span>
              <span className="page-title-stats-label">Dossiers</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{statistics.classeurs}</span>
              <span className="page-title-stats-label">Classeurs</span>
            </div>
            <div className="page-title-stats-item">
              <span className="page-title-stats-number">{statistics.files}</span>
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
              {/* Grille des éléments de la corbeille */}
              <div className="trash-grid-container">
                <div className="trash-grid">
                  {trashItems.map((item) => (
                    <TrashItemCard
                      key={item.id}
                      item={item}
                      onRestore={handleRestore}
                      onDelete={handlePermanentDelete}
                    />
                  ))}
                </div>
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
  onRestore: (item: TrashItem) => void; 
  onDelete: (item: TrashItem) => void; 
}) {
  const getIcon = () => {
    switch (item.type) {
      case 'note':
        return <FileText size={20} />;
      case 'folder':
        return <Folder size={20} />;
      case 'classeur':
        return <Archive size={20} />;
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
      case 'classeur':
        return 'Classeur';
      case 'file':
        return 'Fichier';
      default:
        return 'Élément';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    const expiresAt = new Date(item.expires_at);
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <motion.div
      className="trash-grid-item"
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
            {formatDate(item.trashed_at)}
          </p>
          <p className="trash-item-expiry">
            Expire dans {getDaysUntilExpiry()} jour{getDaysUntilExpiry() > 1 ? 's' : ''}
          </p>
        </div>
        <div className="trash-item-actions">
          <button
            className="trash-action-btn restore-btn"
            onClick={() => onRestore(item)}
            title="Restaurer"
          >
            <RotateCcw size={16} />
            <span>Restaurer</span>
          </button>
          <button
            className="trash-action-btn delete-btn"
            onClick={() => onDelete(item)}
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