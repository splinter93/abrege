"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Clock, AlertCircle, FileText, Folder, RotateCcw, Trash, Trash2, RefreshCw, TrashIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedUser } from '@/types/dossiers';
import type { TrashItem, TrashStatistics } from '@/types/supabase';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import { useSecureErrorHandler } from '@/components/SecureErrorHandler';
import { simpleLogger as logger } from '@/utils/logger';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import DossierErrorBoundary from '@/components/DossierErrorBoundary';
import { DossierLoadingState, DossierErrorState } from '@/components/DossierLoadingStates';

import "@/styles/main.css";
import "./index.css";

export default function Trash2Page() {
  return (
    <DossierErrorBoundary>
      <AuthGuard>
        <Trash2PageContent />
      </AuthGuard>
    </DossierErrorBoundary>
  );
}

function Trash2PageContent() {
  const { user, loading: authLoading } = useAuth();
  
  // 🔧 FIX: Gérer le cas où l'utilisateur n'est pas encore chargé AVANT d'appeler les hooks
  if (authLoading || !user?.id) {
    return <DossierLoadingState type="initial" message="Vérification de l'authentification..." />;
  }
  
  // Maintenant on sait que user.id existe, on peut appeler tous les hooks en toute sécurité
  return <AuthenticatedTrash2Content user={user} />;
}

// 🔧 FIX: Composant séparé pour éviter les problèmes d'ordre des hooks
function AuthenticatedTrash2Content({ user }: { user: AuthenticatedUser }) {
  // Gestionnaire d'erreur sécurisé - TOUJOURS en premier
  const { handleError } = useSecureErrorHandler({
    context: 'Trash2Page',
    operation: 'gestion_corbeille_2',
    userId: user.id
  });
  
  // État pour la gestion de la corbeille 2
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
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(true);

  // Fonction stable pour charger les éléments de la corbeille 2
  const loadTrashItems = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { TrashService } = await import('@/services/trashService');
      const data = await TrashService.getTrashItems();
      
      setTrashItems(data.items);
      setStatistics(data.statistics);
      setRetryCount(0);
      setCanRetry(true);
    } catch (err) {
      logger.error('[Trash2Page] Erreur chargement corbeille 2:', err);
      handleError(err, 'chargement corbeille 2');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setRetryCount(prev => prev + 1);
      setCanRetry(retryCount < 3);
    } finally {
      setLoading(false);
    }
  }, [user?.id, handleError, retryCount]); // Seulement quand l'ID de l'utilisateur change

  // Charger les données au montage du composant
  useEffect(() => {
    if (user) {
      loadTrashItems();
    }
  }, [user?.id, loadTrashItems]);

  // Fonction de retry avec backoff
  const retryWithBackoff = useCallback(async () => {
    if (!canRetry) return;
    
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    await loadTrashItems();
  }, [canRetry, retryCount, loadTrashItems]);

  // Fonction de refresh
  const refreshData = useCallback(() => {
    loadTrashItems();
  }, [loadTrashItems]);

  // Fonction de force reload
  const forceReload = useCallback(() => {
    setRetryCount(0);
    setCanRetry(true);
    loadTrashItems();
  }, [loadTrashItems]);

  // Fonctions de gestion
  const handleRestore = useCallback(async (item: TrashItem) => {
    logger.dev('[Trash2Page] 🔄 RESTAURATION DÉBUT - Élément:', item);
    logger.dev('[Trash2Page] 🔄 RESTAURATION - Type:', item.type, 'ID:', item.id);
    try {
      logger.dev('[Trash2Page] 🔄 RESTAURATION - Import TrashService...');
      const { TrashService } = await import('@/services/trashService');
      logger.dev('[Trash2Page] 🔄 RESTAURATION - Appel TrashService.restoreItem...');
      await TrashService.restoreItem(item.type, item.id);
      
      logger.dev('[Trash2Page] ✅ RESTAURATION - Élément restauré avec succès');
      // Recharger la liste après restauration
      logger.dev('[Trash2Page] 🔄 RESTAURATION - Rechargement de la liste...');
      await loadTrashItems();
      logger.dev('[Trash2Page] ✅ RESTAURATION - Liste rechargée');
    } catch (err) {
      logger.error('[Trash2Page] ❌ RESTAURATION - Erreur:', err);
      handleError(err, 'restauration élément');
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    }
  }, [loadTrashItems, handleError]);

  const handlePermanentDelete = useCallback(async (item: TrashItem) => {
    logger.dev('[Trash2Page] 🗑️ SUPPRESSION DÉBUT - Élément:', item);
    logger.dev('[Trash2Page] 🗑️ SUPPRESSION - Type:', item.type, 'ID:', item.id);
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${item.name}" ?`)) {
      logger.dev('[Trash2Page] ❌ SUPPRESSION - Annulée par l\'utilisateur');
      return;
    }

    try {
      logger.dev('[Trash2Page] 🗑️ SUPPRESSION - Import TrashService...');
      const { TrashService } = await import('@/services/trashService');
      logger.dev('[Trash2Page] 🗑️ SUPPRESSION - Appel TrashService.permanentlyDeleteItem...');
      await TrashService.permanentlyDeleteItem(item.type, item.id);
      
      logger.dev('[Trash2Page] ✅ SUPPRESSION - Élément supprimé définitivement avec succès');
      // Recharger la liste après suppression
      logger.dev('[Trash2Page] 🗑️ SUPPRESSION - Rechargement de la liste...');
      await loadTrashItems();
      logger.dev('[Trash2Page] ✅ SUPPRESSION - Liste rechargée');
    } catch (err) {
      logger.error('[Trash2Page] ❌ SUPPRESSION - Erreur:', err);
      handleError(err, 'suppression définitive');
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }, [loadTrashItems, handleError]);

  const handleEmptyTrash = useCallback(async () => {
    if (!confirm('Êtes-vous sûr de vouloir vider complètement la corbeille 2 ? Cette action est irréversible.')) {
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
      logger.error('[Trash2Page] Erreur vidage corbeille 2:', err);
      handleError(err, 'vidage corbeille 2');
      setError(err instanceof Error ? err.message : 'Erreur lors du vidage de la corbeille 2');
    }
  }, [handleError]);

  // Afficher l'état de chargement initial
  if (loading && trashItems.length === 0) {
    return <DossierLoadingState type="initial" message="Chargement de la corbeille 2..." />;
  }

  // Afficher l'état d'erreur
  if (error) {
    return (
      <DossierErrorState
        message={error}
        retryCount={retryCount}
        canRetry={canRetry}
        onRetry={retryWithBackoff}
        onRefresh={refreshData}
        onForceReload={forceReload}
      />
    );
  }

  return (
    <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
        {/* Titre de la page avec design uniforme */}
        <UnifiedPageTitle
          icon={Trash2}
          title="Corbeille 2"
          subtitle="Gérez vos éléments supprimés et restaurez ce qui est important"
          stats={[
            { number: statistics.total, label: `élément${statistics.total > 1 ? 's' : ''}` },
            { number: statistics.notes, label: 'notes' },
            { number: statistics.folders, label: 'dossiers' }
          ]}
        />

        {/* Container glassmorphism principal */}
        <motion.div 
          className="glassmorphism-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          {/* Header avec séparateur */}
          <div className="trash-container-header">
            <div className="trash-header-left">
              <h2 className="trash-header-title">Éléments supprimés récemment</h2>
              <p className="trash-header-description">
                Conservation automatique de 30 jours
              </p>
            </div>
            <div className="trash-header-right">
              <button
                className="trash-empty-button"
                onClick={handleEmptyTrash}
                disabled={loading || trashItems.length === 0}
                title="Vider la corbeille 2"
              >
                <Trash size={16} />
                <span>Vider la corbeille</span>
              </button>
            </div>
          </div>
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
                <h2 className="empty-state-title">Corbeille 2 vide</h2>
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
        </motion.div>
      </main>
    </div>
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
        return <FileText size={36} />;
      case 'folder':
        return <Folder size={36} />;
      case 'classeur':
        return <Archive size={36} />;
      case 'file':
        return <FileText size={36} />;
      default:
        return <FileText size={36} />;
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

  const getDaysUntilExpiry = () => {
    const now = new Date();
    const expiresAt = new Date(item.expires_at);
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatTimeRemaining = () => {
    const days = getDaysUntilExpiry();
    if (days === 0) {
      return "Expire aujourd'hui";
    } else if (days === 1) {
      return "Expire demain";
    } else {
      return `${days} jours restants`;
    }
  };

  return (
    <motion.div
      className="fm-grid-item trash-item-simple"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Icône avec style identique aux dossiers/fichiers */}
      <div className={`fm-grid-item-icon ${getIconClass()}`}>
        {getIcon()}
      </div>

      {/* Nom de l'élément */}
      <div className="fm-grid-item-name">
        {item.name}
      </div>

      {/* Temps restant */}
      <div className="trash-item-time-remaining">
        <Clock size={14} />
        {formatTimeRemaining()}
      </div>
    </motion.div>
  );
}
