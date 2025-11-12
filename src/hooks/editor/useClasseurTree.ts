/**
 * Hook useClasseurTree
 * 
 * Charge l'arborescence complète d'un classeur via API
 * - GET /api/v2/classeur/[ref]/tree?depth=2
 * - Cache intelligent par classeur (Map)
 * - Invalidation manuelle si besoin
 * 
 * Performance:
 * - Un seul GET par classeur (cache)
 * - Pas de store global
 * - Lazy loading (charge à la demande)
 * 
 * @module hooks/editor/useClasseurTree
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Structure d'un dossier dans l'arborescence
 */
export interface TreeFolder {
  id: string;
  name: string;
  parent_id: string | null;
  children?: TreeFolder[]; // Sous-dossiers
  notes?: TreeNote[]; // Notes du dossier
}

/**
 * Structure d'une note dans l'arborescence
 */
export interface TreeNote {
  id: string;
  source_title: string; // ✅ API retourne source_title, pas title
  slug?: string;
  header_image?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Structure de l'arborescence complète d'un classeur
 */
export interface ClasseurTreeData {
  classeur: {
    id: string;
    name: string;
    emoji?: string;
  };
  tree: TreeFolder[]; // Dossiers racine
  notes_at_root: TreeNote[]; // Notes à la racine (sans dossier)
}

/**
 * Cache global des trees par classeur
 * Persiste entre les composants
 */
const treeCache = new Map<string, ClasseurTreeData>();

interface UseClasseurTreeOptions {
  /** ID ou slug du classeur à charger */
  classeurRef: string | null;
  /** Profondeur de l'arborescence (default: 2 = tous niveaux) */
  depth?: number;
  /** Forcer le rechargement (bypass cache) */
  forceRefresh?: boolean;
}

interface UseClasseurTreeReturn {
  /** Données de l'arborescence */
  data: ClasseurTreeData | null;
  /** Chargement en cours */
  loading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Fonction pour rafraîchir manuellement */
  refresh: () => Promise<void>;
}

/**
 * Hook useClasseurTree
 * 
 * @example
 * ```typescript
 * const { data, loading, error, refresh } = useClasseurTree({
 *   classeurRef: 'work',
 *   depth: 2
 * });
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * 
 * return <Tree data={data.tree} />;
 * ```
 */
export function useClasseurTree({
  classeurRef,
  depth = 2,
  forceRefresh = false
}: UseClasseurTreeOptions): UseClasseurTreeReturn {
  
  const [data, setData] = useState<ClasseurTreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref pour éviter double-fetch
  const isFetchingRef = useRef(false);

  /**
   * Charger l'arborescence du classeur
   */
  const loadTree = useCallback(async () => {
    // ✅ FIX: Skip si pas de classeurRef (note orpheline) ou canva-local (temporary)
    if (!classeurRef || classeurRef === 'canva-local') {
      const emptyTree: ClasseurTreeData = {
        classeur: classeurRef === 'canva-local' 
          ? { id: 'canva-local', name: 'Canva (local)', emoji: '🎨' }
          : undefined,
        tree: [],
        notes_at_root: []
      };
      
      if (classeurRef) {
        logger.debug(LogCategory.EDITOR, '[useClasseurTree] ⏭️  Skipping API call', { classeurRef });
        treeCache.set(classeurRef, emptyTree);
      }
      
      setData(emptyTree);
      setLoading(false);
      setError(null);
      return;
    }

    // Skip si déjà en cours de chargement
    if (isFetchingRef.current) {
      logger.dev('[useClasseurTree] ⏭️  Fetch déjà en cours, skip');
      return;
    }

    // Vérifier cache (sauf si forceRefresh)
    if (!forceRefresh && treeCache.has(classeurRef)) {
      const cached = treeCache.get(classeurRef);
      logger.dev('[useClasseurTree] ⚡ Cache hit:', { classeurRef, items: cached?.tree.length });
      setData(cached!);
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      logger.dev('[useClasseurTree] 🔄 Chargement tree:', { classeurRef, depth });

      // Récupérer token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Non authentifié');
      }

      // GET /api/v2/classeur/[ref]/tree?depth=2
      const response = await fetch(`/api/v2/classeur/${classeurRef}/tree?depth=${depth}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur API: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      // ✅ FIX: L'API retourne tree: { folders: [...], notes: [...] }
      const treeData: ClasseurTreeData = {
        classeur: result.classeur,
        tree: result.tree?.folders || [], // ✅ Dossiers racine
        notes_at_root: result.tree?.notes || [] // ✅ Notes racine
      };

      // Mettre en cache
      treeCache.set(classeurRef, treeData);

      setData(treeData);

      logger.info('[useClasseurTree] ✅ Tree chargé:', {
        classeurRef,
        classeur: result.classeur?.name,
        folders: result.tree?.length || 0,
        notes: result.notes_at_root?.length || 0
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      const metadata = (err && typeof err === 'object' && !(err instanceof Error)) ? err : undefined;
      logger.error('[useClasseurTree] ❌ Erreur chargement tree:', {
        error: errorMessage,
        classeurRef,
        metadata
      }, err instanceof Error ? err : undefined);
      setError(errorMessage);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [classeurRef, depth, forceRefresh]);

  /**
   * Rafraîchir manuellement (bypass cache)
   */
  const refresh = useCallback(async () => {
    if (!classeurRef) return;
    if (classeurRef === 'canva-local') {
      const emptyTree: ClasseurTreeData = {
        classeur: { id: 'canva-local', name: 'Canva (local)', emoji: '🎨' },
        tree: [],
        notes_at_root: []
      };
      treeCache.set(classeurRef, emptyTree);
      setData(emptyTree);
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }
    
    // Invalider cache
    treeCache.delete(classeurRef);
    
    // Recharger
    await loadTree();
  }, [classeurRef, loadTree]);

  // Charger au changement de classeur
  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return {
    data,
    loading,
    error,
    refresh
  };
}

