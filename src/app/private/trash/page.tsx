'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, FileText, Folder, Archive, Clock, AlertCircle } from 'react-feather';
import { useAuth } from '@/hooks/useAuth';
import type { AuthenticatedUser } from '@/types/dossiers';
import './trash.css';

export default function TrashPage() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <div className="dossiers-loading">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="trash-content-area">
      {/* Titre de la page avec glassmorphism */}
      <motion.div 
        className="trash-page-title-glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="title-content">
          <div className="title-icon-container">
            <Trash2 className="title-icon" />
          </div>
          
          <div className="title-section">
            <h1 className="page-title">Corbeille</h1>
            <p className="page-subtitle">
              Gérez vos éléments supprimés et restaurez ce qui est important
            </p>
          </div>
          
          <div className="title-stats">
            <div className="stats-item">
              <div className="stats-number">0</div>
              <div className="stats-label">Éléments</div>
            </div>
            <div className="stats-item">
              <div className="stats-number">0</div>
              <div className="stats-label">Notes</div>
            </div>
            <div className="stats-item">
              <div className="stats-number">0</div>
              <div className="stats-label">Dossiers</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Contenu principal */}
      <motion.div 
        className="trash-content-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* État vide avec design moderne */}
        <div className="trash-empty-state">
          <div className="empty-state-icon">
            <Archive size={64} />
          </div>
          <h2 className="empty-state-title">Corbeille vide</h2>
          <p className="empty-state-description">
            Aucun élément n'a été supprimé pour le moment. 
            Les éléments supprimés apparaîtront ici.
          </p>
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
      </motion.div>
    </div>
  );
} 