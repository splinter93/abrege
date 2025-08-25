'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, FileText, Folder } from 'react-feather';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedUser } from '@/types/dossiers';

export default function TrashPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="dossiers-content-area">
        <div className="dossiers-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="dossiers-content-area">
      {/* Titre de la page avec design glassmorphism */}
      <motion.div 
        className="dossiers-page-title-glass"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="title-content">
          <motion.div 
            className="title-icon-container"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="title-icon">🗑️</span>
          </motion.div>
          <div className="title-section">
            <h1 className="page-title">Corbeille</h1>
            <p className="page-subtitle">Gérez vos éléments supprimés</p>
          </div>
          <div className="title-stats">
            <div className="stats-item">
              <span className="stats-number">0</span>
              <span className="stats-label">élément{0 > 1 ? 's' : ''} supprimé{0 > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section principale avec design glassmorphism */}
      <motion.section 
        className="content-section-glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      >
        <div className="content-main-container-glass">
          {/* État vide */}
          <div className="trash-empty-state">
            <div className="trash-empty-icon">
              <Trash2 size={64} />
            </div>
            <h2>Votre corbeille est vide</h2>
            <p>Les éléments supprimés apparaîtront ici. Ils seront définitivement supprimés après 30 jours.</p>
            
            {/* Statistiques */}
            <div className="trash-stats">
              <div className="stat-item">
                <Folder size={20} />
                <span>0 dossiers supprimés</span>
              </div>
              <div className="stat-item">
                <FileText size={20} />
                <span>0 notes supprimées</span>
              </div>
            </div>
          </div>

          {/* Informations sur la corbeille */}
          <motion.div 
            className="trash-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <h3>Comment fonctionne la corbeille ?</h3>
            <ul>
              <li>Les éléments supprimés sont conservés pendant 30 jours</li>
              <li>Vous pouvez les restaurer à tout moment pendant cette période</li>
              <li>Après 30 jours, ils sont définitivement supprimés</li>
              <li>La corbeille se vide automatiquement</li>
            </ul>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
} 