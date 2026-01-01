/**
 * 🔄 RealtimeEditorManager - Gestionnaire de lifecycle pour Realtime Editor
 * 
 * Composant React qui gère le cycle de vie de la connexion Realtime
 * pour l'éditeur. S'initialise automatiquement et gère la reconnexion.
 */

import React, { useEffect, useRef, useState } from 'react';
import { realtimeEditorService, RealtimeEditorConfig, RealtimeEditorState } from '@/services/realtime/RealtimeEditorService';
import { simpleLogger as logger } from '@/utils/logger';

interface RealtimeEditorManagerProps {
  noteId: string;
  userId: string;
  debug?: boolean;
  autoReconnect?: boolean;
  onStateChange?: (state: RealtimeEditorState) => void;
  onEvent?: (event: { type: string; payload: unknown; timestamp: number }) => void;
  children?: React.ReactNode;
}

/**
 * Gestionnaire de lifecycle pour la connexion Realtime de l'éditeur
 */
export default function RealtimeEditorManager({
  noteId,
  userId,
  debug = false,
  autoReconnect = true,
  onStateChange,
  onEvent,
  children
}: RealtimeEditorManagerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentState, setCurrentState] = useState<RealtimeEditorState>({
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    lastActivity: 0
  });

  const configRef = useRef<RealtimeEditorConfig | null>(null);
  const unsubscribeStateRef = useRef<(() => void) | null>(null);
  const unsubscribeEventRef = useRef<(() => void) | null>(null);

  // Initialisation du service
  useEffect(() => {
    const initializeService = async () => {
      if (!noteId || !userId) {
        logger.warn('[RealtimeEditorManager] NoteId ou UserId manquant');
        return;
      }

      const config: RealtimeEditorConfig = {
        noteId,
        userId,
        debug,
        autoReconnect
      };

      configRef.current = config;

      try {
        logger.info('[RealtimeEditorManager] 🚀 Initialisation du service Realtime', {
          noteId,
          userId,
          debug
        });

        await realtimeEditorService.initialize(config);
        setIsInitialized(true);

        // S'abonner aux changements d'état
        unsubscribeStateRef.current = realtimeEditorService.onStateChange((state) => {
          setCurrentState(state);
          onStateChange?.(state);
        });

        // S'abonner aux événements
        unsubscribeEventRef.current = realtimeEditorService.onEvent((event) => {
          onEvent?.(event);
        });

        logger.info('[RealtimeEditorManager] ✅ Service initialisé avec succès');

      } catch (error) {
        logger.error('[RealtimeEditorManager] ❌ Erreur d\'initialisation:', error);
      }
    };

    initializeService();

    // Cleanup à la destruction
    return () => {
      logger.info('[RealtimeEditorManager] 🧹 Nettoyage du gestionnaire');
      
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current();
        unsubscribeStateRef.current = null;
      }

      if (unsubscribeEventRef.current) {
        unsubscribeEventRef.current();
        unsubscribeEventRef.current = null;
      }

      // Ne pas détruire le service ici car il peut être utilisé par d'autres composants
      // Le service sera nettoyé automatiquement quand plus personne ne l'utilise
    };
  }, [noteId, userId, debug, autoReconnect, onStateChange, onEvent]);

  // Gestion des changements de configuration
  useEffect(() => {
    if (!isInitialized || !configRef.current) return;

    const currentConfig = configRef.current;
    const newConfig: RealtimeEditorConfig = {
      noteId,
      userId,
      debug,
      autoReconnect
    };

    // Vérifier si la configuration a changé
    const configChanged = 
      currentConfig.noteId !== newConfig.noteId ||
      currentConfig.userId !== newConfig.userId ||
      currentConfig.debug !== newConfig.debug ||
      currentConfig.autoReconnect !== newConfig.autoReconnect;

    if (configChanged) {
      logger.info('[RealtimeEditorManager] 🔄 Configuration changée - réinitialisation');
      
      // Réinitialiser avec la nouvelle configuration
      realtimeEditorService.initialize(newConfig).then(() => {
        configRef.current = newConfig;
      }).catch((error) => {
        logger.error('[RealtimeEditorManager] ❌ Erreur de réinitialisation:', error);
      });
    }
  }, [noteId, userId, debug, autoReconnect, isInitialized]);

  // Gestion de la visibilité de la page
  useEffect(() => {
    // Vérifier que nous sommes côté client
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        logger.info('[RealtimeEditorManager] 👁️ Page visible - vérification connexion');
        
        // Vérifier si la connexion est toujours active
        const state = realtimeEditorService.getState();
        if (!state.isConnected && !state.isConnecting) {
          logger.info('[RealtimeEditorManager] 🔄 Reconnexion automatique');
          realtimeEditorService.reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized]);

  // Gestion des erreurs de connexion
  useEffect(() => {
    if (currentState.connectionStatus === 'error' && currentState.lastError) {
      logger.error('[RealtimeEditorManager] ❌ Erreur de connexion:', currentState.lastError);
      
      // Optionnel : notifier l'utilisateur de l'erreur
      if (debug) {
        console.warn('[RealtimeEditorManager] Erreur de connexion Realtime:', {
          error: currentState.lastError,
          attempts: currentState.reconnectAttempts
        });
      }
    }
  }, [currentState.connectionStatus, currentState.lastError, currentState.reconnectAttempts, debug]);

  // Mode debug : afficher l'état de la connexion
  if (debug && process.env.NODE_ENV === 'development') {
    return (
      <div className="realtime-editor-manager-debug">
        {children}
        <div className="realtime-editor-debug-panel">
          <h4>🔄 Realtime Editor Status</h4>
          <div className="debug-info">
            <div>Status: <span className={`status-${currentState.connectionStatus}`}>
              {currentState.connectionStatus}
            </span></div>
            <div>Connected: {currentState.isConnected ? '✅' : '❌'}</div>
            <div>Connecting: {currentState.isConnecting ? '🔄' : '⏸️'}</div>
            <div>Reconnect Attempts: {currentState.reconnectAttempts}</div>
            <div>Last Activity: {new Date(currentState.lastActivity).toLocaleTimeString()}</div>
            {currentState.lastError && (
              <div className="error">Error: {currentState.lastError}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mode production : rendre uniquement les enfants
  return <>{children}</>;
}

/**
 * Hook pour accéder à l'état du RealtimeEditorManager
 */
export function useRealtimeEditorState() {
  const [state, setState] = useState<RealtimeEditorState>(() => 
    realtimeEditorService.getState()
  );

  useEffect(() => {
    const unsubscribe = realtimeEditorService.onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook pour accéder au service RealtimeEditor
 */
export function useRealtimeEditorService() {
  return realtimeEditorService;
}
