'use client';

import React from 'react';
import PageTitleSimple from './PageTitleSimple';
import { useUserStats } from '@/hooks/useUserStats';

interface DashboardTitleProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Composant de titre du dashboard avec statistiques dynamiques
 * Utilise useUserStats pour récupérer les compteurs en temps réel
 */
const DashboardTitle: React.FC<DashboardTitleProps> = ({
  title = "Dashboard",
  subtitle = "Gérez vos notes et classeurs",
  className = ''
}) => {
  const { stats, loading, error } = useUserStats();

  // Formater les statistiques pour l'affichage
  const formatStats = () => {
    if (!stats) return [];

    return [
      { 
        number: stats.total_notes, 
        label: "Notes" 
      },
      { 
        number: stats.total_classeurs, 
        label: "Classeurs" 
      },
      { 
        number: stats.total_folders, 
        label: "Dossiers" 
      }
    ];
  };

  // Gérer les erreurs en affichant des valeurs par défaut
  const getStats = () => {
    if (error) {
      return [
        { number: '?', label: "Notes" },
        { number: '?', label: "Classeurs" },
        { number: '?', label: "Dossiers" }
      ];
    }
    return formatStats();
  };

  return (
    <PageTitleSimple
      title={title}
      subtitle={subtitle}
      stats={getStats()}
      loading={loading}
      className={className}
    />
  );
};

export default DashboardTitle;
