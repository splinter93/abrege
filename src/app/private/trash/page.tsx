"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Clock, AlertCircle, FileText, Folder, RotateCcw, Trash } from 'react-feather';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedUser } from '@/types/dossiers';
import type { TrashItem, TrashStatistics } from '@/types/supabase';
import AuthGuard from '@/components/AuthGuard';
import PageLoading from '@/components/PageLoading';
import ErrorBoundary from '@/components/ErrorBoundary';
import UnifiedPageLayout from '@/components/UnifiedPageLayout';
import { useSecureErrorHandler } from '@/components/SecureErrorHandler';
import { simpleLogger as logger } from '@/utils/logger';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import { Trash2 } from 'lucide-react';

import './index.css';

export default function TrashPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <TrashPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function TrashPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return <PageLoading message="Vérification de l'authentification..." />;
  }
  
  // Maintenant on sait que user.id existe, on peut appeler tous les hooks en toute sécurité
  return <AuthenticatedTrashContent user={user} />;
}

// 🔧 FIX: Composant séparé pour éviter les problèmes d'ordre des hooks
function AuthenticatedTrashContent({ user }: { user: AuthenticatedUser }) {
  // Gestionnaire d'erreur sécurisé
  const { handleError } = useSecureErrorHandler({
    context: 'TrashPage',
    operation: 'gestion_corbeille',
    userId: user.id
  });
  
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
      logger.error('[TrashPage] Erreur chargement corbeille:', err);
      handleError(err, 'chargement corbeille');
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
  const handleRestore = useCallback(async (item: TrashItem) => {
    logger.dev('[TrashPage] 🔄 RESTAURATION DÉBUT - Élément:', item);
    logger.dev('[TrashPage] 🔄 RESTAURATION - Type:', item.type, 'ID:', item.id);
    try {
      logger.dev('[TrashPage] 🔄 RESTAURATION - Import TrashService...');
      const { TrashService } = await import('@/services/trashService');
      logger.dev('[TrashPage] 🔄 RESTAURATION - Appel TrashService.restoreItem...');
      await TrashService.restoreItem(item.type, item.id);
      
      logger.dev('[TrashPage] ✅ RESTAURATION - Élément restauré avec succès');
      // Recharger la liste après restauration
      logger.dev('[TrashPage] 🔄 RESTAURATION - Rechargement de la liste...');
      await loadTrashItems();
      logger.dev('[TrashPage] ✅ RESTAURATION - Liste rechargée');
    } catch (err) {
      logger.error('[TrashPage] ❌ RESTAURATION - Erreur:', err);
      handleError(err, 'restauration élément');
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    }
  }, [loadTrashItems, handleError]);

  const handlePermanentDelete = useCallback(async (item: TrashItem) => {
    logger.dev('[TrashPage] 🗑️ SUPPRESSION DÉBUT - Élément:', item);
    logger.dev('[TrashPage] 🗑️ SUPPRESSION - Type:', item.type, 'ID:', item.id);
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${item.name}" ?`)) {
      logger.dev('[TrashPage] ❌ SUPPRESSION - Annulée par l\'utilisateur');
      return;
    }

    try {
      logger.dev('[TrashPage] 🗑️ SUPPRESSION - Import TrashService...');
      const { TrashService } = await import('@/services/trashService');
      logger.dev('[TrashPage] 🗑️ SUPPRESSION - Appel TrashService.permanentlyDeleteItem...');
      await TrashService.permanentlyDeleteItem(item.type, item.id);
      
      logger.dev('[TrashPage] ✅ SUPPRESSION - Élément supprimé définitivement avec succès');
      // Recharger la liste après suppression
      logger.dev('[TrashPage] 🗑️ SUPPRESSION - Rechargement de la liste...');
      await loadTrashItems();
      logger.dev('[TrashPage] ✅ SUPPRESSION - Liste rechargée');
    } catch (err) {
      logger.error('[TrashPage] ❌ SUPPRESSION - Erreur:', err);
      handleError(err, 'suppression définitive');
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }, [loadTrashItems, handleError]);

  const handleEmptyTrash = useCallback(async () => {
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
      logger.error('[TrashPage] Erreur vidage corbeille:', err);
      handleError(err, 'vidage corbeille');
      setError(err instanceof Error ? err.message : 'Erreur lors du vidage de la corbeille');
    }
  }, [handleError]);

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
    <UnifiedPageLayout className="page-trash">
        {/* Titre de la page avec design uniforme */}
        <UnifiedPageTitle
          icon={Trash2}
          title="Corbeille"
          subtitle="Gérez vos éléments supprimés et restaurez ce qui est important"
          stats={[
            { number: statistics.total, label: `élément${statistics.total > 1 ? 's' : ''}` },
            { number: statistics.notes, label: 'notes' },
            { number: statistics.folders, label: 'dossiers' }
          ]}
        />

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
    </UnifiedPageLayout>
  );
}

// Composant pour afficher un élément de la corbeille - Style identique aux dossiers/fichiers
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
        return <FileText size={28} />;
      case 'folder':
        return <Folder size={28} />;
      case 'classeur':
        return <Archive size={28} />;
      case 'file':
        return <FileText size={28} />;
      default:
        return <FileText size={28} />;
    }
  };

  const getIconClass = () => {
    switch (item.type) {
      case 'note':
        return 'file-icon';
      case 'folder':
        return 'folder-icon';
      case 'classeur':
        return 'classeur-icon';
      case 'file':
        return 'file-icon';
      default:
        return 'file-icon';
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
      className="fm-grid-item trash-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Icône avec style identique aux dossiers/fichiers */}
      <div className={getIconClass()}>
        {getIcon()}
      </div>

      {/* Nom de l'élément */}
      <div className="fm-grid-item-name">
        {item.name}
      </div>

      {/* Date de suppression */}
      <div className="trash-item-date">
        <Clock size={12} />
        {formatDate(item.trashed_at)}
      </div>

      {/* Actions - boutons restaurer et supprimer */}
      <div className="trash-item-actions">
        <button
          className="trash-action-btn restore-btn"
          onClick={() => {
            logger.dev('[TrashPage] 🔄 Bouton Restaurer cliqué pour:', item);
            onRestore(item);
          }}
          title="Restaurer"
        >
          <RotateCcw size={14} />
          <span>Restaurer</span>
        </button>
        <button
          className="trash-action-btn delete-btn"
          onClick={() => {
            logger.dev('[TrashPage] 🗑️ Bouton Supprimer cliqué pour:', item);
            onDelete(item);
          }}
          title="Supprimer définitivement"
        >
          <Trash size={14} />
          <span>Supprimer</span>
        </button>
      </div>
    </motion.div>
  );
} 