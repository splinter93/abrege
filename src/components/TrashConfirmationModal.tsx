import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, RotateCcw } from 'react-feather';

interface TrashConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: 'note' | 'folder' | 'classeur' | 'file';
  itemName: string;
  hasChildren?: boolean;
  childrenCount?: number;
}

/**
 * Modal de confirmation pour les suppressions en corbeille
 * Affiche des avertissements spécifiques selon le type d'élément et s'il a des enfants
 */
export default function TrashConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
  hasChildren = false,
  childrenCount = 0
}: TrashConfirmationModalProps) {
  const getItemIcon = () => {
    switch (itemType) {
      case 'note':
        return '📄';
      case 'folder':
        return '📁';
      case 'classeur':
        return '📚';
      case 'file':
        return '📎';
      default:
        return '📄';
    }
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'note':
        return 'cette note';
      case 'folder':
        return 'ce dossier';
      case 'classeur':
        return 'ce classeur';
      case 'file':
        return 'ce fichier';
      default:
        return 'cet élément';
    }
  };

  const getChildrenWarning = () => {
    if (!hasChildren) return null;

    switch (itemType) {
      case 'classeur':
        return `Ce classeur contient ${childrenCount} élément${childrenCount > 1 ? 's' : ''} (dossiers et notes). Tous ces éléments seront également mis en corbeille.`;
      case 'folder':
        return `Ce dossier contient ${childrenCount} note${childrenCount > 1 ? 's' : ''}. Toutes ces notes seront également mises en corbeille.`;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content trash-confirmation-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-icon warning">
                <AlertTriangle size={24} />
              </div>
              <h2 className="modal-title">Confirmer la suppression</h2>
            </div>

            <div className="modal-body">
              <div className="confirmation-content">
                <div className="item-preview">
                  <span className="item-icon">{getItemIcon()}</span>
                  <span className="item-name">{itemName}</span>
                </div>

                <p className="confirmation-message">
                  Êtes-vous sûr de vouloir mettre {getItemTypeLabel()} en corbeille ?
                </p>

                {getChildrenWarning() && (
                  <div className="children-warning">
                    <div className="warning-icon">
                      <AlertTriangle size={16} />
                    </div>
                    <p className="warning-text">{getChildrenWarning()}</p>
                  </div>
                )}

                <div className="trash-info">
                  <div className="info-item">
                    <RotateCcw size={16} />
                    <span>Vous pourrez restaurer cet élément pendant 30 jours</span>
                  </div>
                  <div className="info-item">
                    <Trash2 size={16} />
                    <span>Après 30 jours, il sera définitivement supprimé</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={onConfirm}
              >
                <Trash2 size={16} />
                Mettre en corbeille
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
