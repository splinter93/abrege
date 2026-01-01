/**
 * Manager pour les paramètres de partage
 * Hook dédié pour gérer la logique de partage des notes
 */

import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import type { EditorState } from '@/hooks/editor/useEditorState';
import { supabase } from '@/supabaseClient';
import { logger, LogCategory } from '@/utils/logger';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/editorConstants';

export interface UseShareManagerOptions {
  noteId: string;
  editorState: EditorState;
  onUpdate: (noteId: string, update: { share_settings: ShareSettings }) => void;
}

export interface UseShareManagerReturn {
  handleShareSettingsChange: (newSettings: ShareSettingsUpdate) => Promise<void>;
}

/**
 * Hook pour gérer les paramètres de partage d'une note
 * Extrait de Editor.tsx pour améliorer la maintenabilité
 * 
 * @param options - Configuration du hook
 * @returns Handler pour mettre à jour les paramètres de partage
 * 
 * @example
 * ```typescript
 * const { handleShareSettingsChange } = useShareManager({
 *   noteId,
 *   editorState,
 *   onUpdate: updateNote
 * });
 * 
 * await handleShareSettingsChange({ visibility: 'link-public' });
 * ```
 */
export function useShareManager({
  noteId,
  editorState,
  onUpdate,
}: UseShareManagerOptions): UseShareManagerReturn {
  
  const handleShareSettingsChange = useCallback(async (newSettings: ShareSettingsUpdate) => {
    try {
      logger.info(LogCategory.EDITOR, 'Début de handleShareSettingsChange');
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'handleShareSettingsChange - newSettings', newSettings);
      }
      
      // Update local state with proper type casting
      const updatedSettings: ShareSettings = {
        visibility: newSettings.visibility || 'private',
        invited_users: newSettings.invited_users || [],
        allow_edit: newSettings.allow_edit || false,
        allow_comments: newSettings.allow_comments || false
      };
      editorState.setShareSettings(updatedSettings);
      logger.info(LogCategory.EDITOR, 'État local mis à jour');
      
      // Update note in store
      onUpdate(noteId, { 
        share_settings: updatedSettings
      });
      logger.info(LogCategory.EDITOR, 'Store mis à jour');
      
      // Call API to update share settings
      logger.info(LogCategory.EDITOR, 'Début appel API...');
      const { data: { session } } = await supabase.auth.getSession();
      logger.info(LogCategory.EDITOR, 'Session récupérée:', session ? 'PRÉSENTE' : 'ABSENTE');
      
      const token = session?.access_token;
      logger.info(LogCategory.EDITOR, 'Token extrait:', token ? 'PRÉSENT' : 'ABSENT');
      
      if (!token) {
        logger.error(LogCategory.EDITOR, 'Pas de token, erreur authentification');
        throw new Error(ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }
      
      const apiUrl = `/api/v2/note/${encodeURIComponent(noteId)}/share`;
      logger.info(LogCategory.EDITOR, 'URL API:', apiUrl);
      logger.info(LogCategory.EDITOR, 'Méthode: PATCH');
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'Headers:', { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token.substring(0, 20)}...` 
        });
      }
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'Body:', JSON.stringify(newSettings));
      }
      
      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newSettings)
      });
      
      // Ajouter plus de logs pour le debugging
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'Réponse fetch reçue', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          url: apiUrl,
          method: 'PATCH'
        });
      }
      
      logger.info(LogCategory.EDITOR, 'Réponse reçue:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      if (!res.ok) {
        // Ne pas appeler res.json() ici pour éviter le double appel
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || ERROR_MESSAGES.UPDATE_SHARE_SETTINGS };
        }
        
        // Améliorer la gestion des erreurs pour éviter les objets vides      
      const errorMessage = errorData?.error || errorData?.message || errorText || ERROR_MESSAGES.UPDATE_SHARE_SETTINGS;
        
        // Créer des détails d'erreur significatifs
        interface ErrorDetails {
          status: number;
          statusText: string;
          message?: string;
        }
        let errorDetails: ErrorDetails = { status: res.status, statusText: res.statusText };
        if (errorData && Object.keys(errorData).length > 0) {
          errorDetails = { ...errorDetails, ...errorData };
        }
        
        logger.error(LogCategory.EDITOR, `Erreur API (${res.status}): ${errorMessage}`, errorDetails);
        throw new Error(errorMessage);
      }
      
      // Vérifier que la réponse a du contenu avant de parser
      const responseText = await res.text();
      let responseData;
      
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
          logger.info(LogCategory.EDITOR, 'Données de réponse:', responseData);
          
          // ✅ CRITIQUE: Mettre à jour public_url dans le store si retourné par l'API
          if (responseData.public_url) {
            logger.info(LogCategory.EDITOR, 'Mise à jour public_url dans le store:', responseData.public_url);
            onUpdate(noteId, { 
              public_url: responseData.public_url 
            } as Record<string, unknown>);
          }
          
          // ✅ CRITIQUE: Mettre à jour share_settings avec la réponse serveur (source de vérité)
          if (responseData.share_settings) {
            logger.info(LogCategory.EDITOR, 'Mise à jour share_settings depuis serveur:', responseData.share_settings);
            editorState.setShareSettings(responseData.share_settings);
            onUpdate(noteId, { 
              share_settings: responseData.share_settings 
            });
          }
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, 'Réponse non-JSON reçue:', responseText);
          responseData = { message: responseText };
        }
      } else {
        logger.info(LogCategory.EDITOR, 'Réponse vide reçue');
        responseData = { message: 'Succès' };
      }
      
      toast.success(SUCCESS_MESSAGES.SHARE_SETTINGS_UPDATED);
      logger.info(LogCategory.EDITOR, 'Fin de handleShareSettingsChange avec succès');
      
    } catch (error) {
      // Améliorer la gestion des erreurs pour éviter les objets vides
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'Pas de stack trace';
      
      // Créer un objet d'erreur structuré pour le logger
      const errorDetails = {
        error: errorMessage,
        stack: errorStack,
        noteId,
        errorType: typeof error,
        errorString: String(error)
      };
      
      logger.error(LogCategory.EDITOR, `ERREUR dans handleShareSettingsChange: ${errorMessage}`, errorDetails);
      logger.info(LogCategory.EDITOR, 'Fin de handleShareSettingsChange avec erreur');
      
      toast.error(errorMessage);
      logger.error(LogCategory.EDITOR, 'Erreur partage:', error);
    }
  }, [noteId, editorState, onUpdate]);

  return {
    handleShareSettingsChange
  };
}

