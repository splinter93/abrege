/**
 * Hook React pour gérer les prompts éditeur
 * @module hooks/useEditorPrompts
 */

import { useState, useEffect, useCallback } from 'react';
import type { 
  EditorPrompt, 
  EditorPromptCreateRequest, 
  EditorPromptUpdateRequest 
} from '@/types/editorPrompts';
import { simpleLogger as logger } from '@/utils/logger';

interface UseEditorPromptsReturn {
  prompts: EditorPrompt[];
  loading: boolean;
  error: string | null;
  createPrompt: (data: EditorPromptCreateRequest) => Promise<EditorPrompt | null>;
  updatePrompt: (id: string, data: EditorPromptUpdateRequest) => Promise<EditorPrompt | null>;
  deletePrompt: (id: string, hardDelete?: boolean) => Promise<boolean>;
  reorderPrompts: (newOrder: string[]) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export interface UseEditorPromptsOptions {
  /** Inclure les prompts inactifs (pour la page de gestion) */
  includeInactive?: boolean;
}

/**
 * Hook pour gérer les prompts éditeur d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @param options - includeInactive: true pour la page prompts (voir tous les prompts)
 * @returns Prompts et fonctions CRUD
 */
export function useEditorPrompts(userId: string | undefined, options: UseEditorPromptsOptions = {}): UseEditorPromptsReturn {
  const { includeInactive = false } = options;
  const [prompts, setPrompts] = useState<EditorPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch les prompts de l'utilisateur
   */
  const fetchPrompts = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const includeParam = includeInactive ? '&include_inactive=true' : '';
      logger.info(`[useEditorPrompts] 📥 Récupération prompts pour user: ${userId}, includeInactive: ${includeInactive}`);

      const response = await fetch(`/api/editor-prompts?user_id=${userId}${includeParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération des prompts');
      }

      const data = await response.json();
      setPrompts(data.prompts || []);

      logger.info(`[useEditorPrompts] ✅ ${data.prompts?.length || 0} prompts récupérés`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('[useEditorPrompts] ❌ Erreur:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, includeInactive]);

  /**
   * Créer un nouveau prompt
   */
  const createPrompt = useCallback(async (
    data: EditorPromptCreateRequest
  ): Promise<EditorPrompt | null> => {
    if (!userId) {
      logger.error('[useEditorPrompts] ❌ User ID manquant pour création');
      return null;
    }

    try {
      logger.info('[useEditorPrompts] 📝 Création prompt:', data.name);

      const response = await fetch('/api/editor-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          user_id: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du prompt');
      }

      const result = await response.json();
      const newPrompt = result.prompt;

      // Ajouter le prompt à la liste locale
      setPrompts(prev => [...prev, newPrompt].sort((a, b) => a.position - b.position));

      logger.info(`[useEditorPrompts] ✅ Prompt créé: ${newPrompt.id}`);

      return newPrompt;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('[useEditorPrompts] ❌ Erreur création:', err);
      setError(errorMessage);
      return null;
    }
  }, [userId]);

  /**
   * Mettre à jour un prompt existant
   */
  const updatePrompt = useCallback(async (
    id: string,
    data: EditorPromptUpdateRequest
  ): Promise<EditorPrompt | null> => {
    try {
      logger.info('[useEditorPrompts] 🔄 Mise à jour prompt:', id);
      logger.dev('[useEditorPrompts] 📋 Données envoyées:', {
        ...data,
        output_schema: data.output_schema ? 'Configuré' : 'Non configuré'
      });

      const response = await fetch(`/api/editor-prompts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour du prompt');
      }

      const result = await response.json();
      const updatedPrompt = result.prompt;

      // Mettre à jour le prompt dans la liste locale
      setPrompts(prev => 
        prev.map(p => p.id === id ? updatedPrompt : p)
          .sort((a, b) => a.position - b.position)
      );

      logger.info(`[useEditorPrompts] ✅ Prompt mis à jour: ${id}`);

      return updatedPrompt;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('[useEditorPrompts] ❌ Erreur mise à jour:', err);
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Supprimer un prompt
   */
  const deletePrompt = useCallback(async (
    id: string,
    hardDelete: boolean = false
  ): Promise<boolean> => {
    try {
      logger.info(`[useEditorPrompts] 🗑️ Suppression prompt: ${id} (hard: ${hardDelete})`);

      const url = hardDelete 
        ? `/api/editor-prompts/${id}?hard=true`
        : `/api/editor-prompts/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression du prompt');
      }

      // Retirer le prompt de la liste locale
      if (hardDelete) {
        setPrompts(prev => prev.filter(p => p.id !== id));
      } else {
        // Soft delete - marquer comme inactif
        setPrompts(prev => prev.map(p => 
          p.id === id ? { ...p, is_active: false } : p
        ).filter(p => p.is_active));
      }

      logger.info(`[useEditorPrompts] ✅ Prompt ${hardDelete ? 'supprimé' : 'désactivé'}: ${id}`);

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('[useEditorPrompts] ❌ Erreur suppression:', err);
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Réorganiser les prompts (drag & drop)
   */
  const reorderPrompts = useCallback(async (newOrder: string[]): Promise<boolean> => {
    try {
      logger.info('[useEditorPrompts] 🔄 Réorganisation prompts');

      // Mettre à jour l'ordre localement d'abord (optimistic update)
      const reorderedPrompts = newOrder.map((id, index) => {
        const prompt = prompts.find(p => p.id === id);
        return prompt ? { ...prompt, position: index } : null;
      }).filter(Boolean) as EditorPrompt[];

      setPrompts(reorderedPrompts);

      // Mettre à jour chaque prompt avec sa nouvelle position
      const updatePromises = reorderedPrompts.map((prompt, index) =>
        fetch(`/api/editor-prompts/${prompt.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ position: index })
        })
      );

      await Promise.all(updatePromises);

      logger.info('[useEditorPrompts] ✅ Prompts réorganisés');

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('[useEditorPrompts] ❌ Erreur réorganisation:', err);
      setError(errorMessage);
      // Recharger les prompts en cas d'erreur
      await fetchPrompts();
      return false;
    }
  }, [prompts, fetchPrompts]);

  // Charger les prompts au montage
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return {
    prompts,
    loading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    reorderPrompts,
    refresh: fetchPrompts
  };
}


