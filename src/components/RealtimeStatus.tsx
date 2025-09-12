'use client';

import React from 'react';
import { useRealtimeState } from '@/hooks/useRealtime';
import { logger, LogCategory } from '@/utils/logger';

interface RealtimeStatusProps {
  readonly userId: string;
  readonly noteId?: string;
}

/**
 * Composant d'affichage de l'état de la connexion Supabase Realtime
 * 
 * @description Affiche un indicateur discret en bas à gauche de l'éditeur
 * montrant l'état de la connexion Realtime (connecté, en cours, erreur)
 * 
 * @param userId - ID de l'utilisateur
 * @param noteId - ID de la note (optionnel)
 * 
 * @returns Composant React d'affichage de l'état Realtime
 */
const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ userId, noteId }) => {
  const realtimeState = useRealtimeState();

  // Log des changements d'état pour le debug
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[RealtimeStatus] État Realtime:', {
        isConnected: realtimeState.isConnected,
        isConnecting: realtimeState.isConnecting,
        error: realtimeState.error,
        channels: realtimeState.channels.length,
        userId,
        noteId
      });
    }
  }, [realtimeState, userId, noteId]);

  // Déterminer l'état et les couleurs
  const getStatusInfo = () => {
    if (realtimeState.error) {
      return {
        text: 'Realtime: Erreur',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '🔴',
        tooltip: `Erreur: ${realtimeState.error}`
      };
    }
    
    if (realtimeState.isConnecting) {
      return {
        text: 'Realtime: Connexion...',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: '🟡',
        tooltip: 'Connexion en cours...'
      };
    }
    
    if (realtimeState.isConnected) {
      const channelCount = realtimeState.channels.length;
      return {
        text: `Realtime: Connecté (${channelCount})`,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: '🟢',
        tooltip: `Connecté avec ${channelCount} canal${channelCount > 1 ? 'x' : ''}`
      };
    }
    
    return {
      text: 'Realtime: Déconnecté',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      icon: '⚪',
      tooltip: 'Déconnecté'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className={`
        fixed bottom-4 left-4 z-50
        px-3 py-2 rounded-lg text-xs font-medium
        ${statusInfo.color} ${statusInfo.bgColor}
        backdrop-blur-sm border border-white/10
        transition-all duration-300 ease-in-out
        hover:scale-105 hover:shadow-lg
        select-none pointer-events-auto
      `}
      title={statusInfo.tooltip}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{statusInfo.icon}</span>
        <span className="font-mono">{statusInfo.text}</span>
      </div>
      
      {/* Indicateur de pulsation pour l'état de connexion */}
      {realtimeState.isConnecting && (
        <div className="absolute inset-0 rounded-lg bg-yellow-400/30 animate-pulse" />
      )}
    </div>
  );
};

export default RealtimeStatus;