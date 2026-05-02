/**
 * Hook pour les datasources Synesia d'un agent (miroir useCallables)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import type { SynesiaDatasource, AgentDatasourceLink } from '@/types/datasources';

export type { AgentDatasourceLink } from '@/types/datasources';

export interface DatasourceListItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  project_id: string;
  /** Surcharge Synesia (icône / couleur utilisateur) */
  customization?: unknown;
}

async function readApiJson(response: Response): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const text = await response.text();
  if (!text.trim()) {
    return { ok: response.ok, data: {} };
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    const data = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { error: 'Réponse JSON invalide' } };
  }
}

export function useDatasources(agentId?: string) {
  const [availableDatasources, setAvailableDatasources] = useState<DatasourceListItem[]>([]);
  const [agentDatasources, setAgentDatasources] = useState<AgentDatasourceLink[]>([]);
  /** Deux flux parallèles (catalogue vs liens agent) pour éviter que le premier « fini » coupe le spinner du second */
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingAgentLinks, setLoadingAgentLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = useMemo(() => loadingCatalog || loadingAgentLinks, [loadingCatalog, loadingAgentLinks]);

  const loadAvailableDatasources = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      setError(null);

      const response = await fetch('/api/synesia/datasources', { cache: 'no-store' });
      const { ok, data } = await readApiJson(response);

      if (!ok) {
        const msg = typeof data.error === 'string' ? data.error : `Erreur HTTP ${response.status}`;
        throw new Error(msg);
      }

      if (data.success === true) {
        const rows: DatasourceListItem[] = (Array.isArray(data.datasources) ? data.datasources : []).map(
          (d: SynesiaDatasource) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            description: typeof d.description === 'string' ? d.description : null,
            project_id: d.project_id,
            customization: d.customization,
          })
        );

        setAvailableDatasources(rows);
        logger.dev(`[useDatasources] ${rows.length} datasources chargés`);
      } else {
        throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors du chargement des datasources');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useDatasources] Erreur chargement datasources:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const loadAgentDatasources = useCallback(async (targetAgentId: string) => {
    if (!targetAgentId) return;

    try {
      setLoadingAgentLinks(true);
      setError(null);

      const response = await fetch(`/api/ui/agents/${targetAgentId}/datasources`, {
        cache: 'no-store',
      });
      const { ok, data } = await readApiJson(response);

      if (!ok) {
        const msg = typeof data.error === 'string' ? data.error : `Erreur HTTP ${response.status}`;
        throw new Error(msg);
      }

      if (data.success === true) {
        const rawLinks = Array.isArray(data.datasources) ? data.datasources : [];
        const links: AgentDatasourceLink[] = rawLinks.map((link: {
          id: string;
          agent_id: string;
          datasource_id: string;
          created_at: string;
          updated_at: string;
          synesia_datasources: SynesiaDatasource | null;
        }) => ({
          id: link.id,
          agent_id: link.agent_id,
          datasource_id: link.datasource_id,
          created_at: link.created_at,
          updated_at: link.updated_at,
          synesia_datasource: link.synesia_datasources!,
        }));

        setAgentDatasources(links);
        logger.dev(`[useDatasources] ${links.length} datasources liés à l'agent ${targetAgentId}`);
      } else {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Erreur lors du chargement des datasources de l\'agent'
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useDatasources] Erreur chargement datasources agent:', err);
    } finally {
      setLoadingAgentLinks(false);
    }
  }, []);

  const linkDatasource = useCallback(async (targetAgentId: string, datasourceId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/ui/agents/${targetAgentId}/datasources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasource_id: datasourceId }),
      });

      const { ok, data } = await readApiJson(response);

      if (!ok) {
        const msg = typeof data.error === 'string' ? data.error : `Erreur HTTP ${response.status}`;
        throw new Error(msg);
      }

      if (data.success === true) {
        logger.dev(`[useDatasources] Datasource ${datasourceId} lié à l'agent ${targetAgentId}`);
        await loadAgentDatasources(targetAgentId);
        return true;
      }
      throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors de la liaison du datasource');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useDatasources] Erreur liaison datasource:', err);
      return false;
    }
  }, [loadAgentDatasources]);

  const unlinkDatasource = useCallback(async (targetAgentId: string, datasourceId: string) => {
    try {
      setError(null);

      const response = await fetch(
        `/api/ui/agents/${targetAgentId}/datasources/${datasourceId}`,
        { method: 'DELETE' }
      );

      const { ok, data } = await readApiJson(response);

      if (!ok) {
        const msg = typeof data.error === 'string' ? data.error : `Erreur HTTP ${response.status}`;
        throw new Error(msg);
      }

      if (data.success === true) {
        logger.dev(`[useDatasources] Datasource ${datasourceId} délié de l'agent ${targetAgentId}`);
        await loadAgentDatasources(targetAgentId);
        return true;
      }
      throw new Error(
        typeof data.error === 'string' ? data.error : 'Erreur lors de la suppression du lien datasource'
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      logger.error('[useDatasources] Erreur suppression liaison datasource:', err);
      return false;
    }
  }, [loadAgentDatasources]);

  useEffect(() => {
    loadAvailableDatasources();
  }, [loadAvailableDatasources]);

  useEffect(() => {
    if (agentId) {
      loadAgentDatasources(agentId);
    } else {
      setAgentDatasources([]);
    }
  }, [agentId, loadAgentDatasources]);

  return {
    availableDatasources,
    agentDatasources,
    loading,
    error,
    loadAvailableDatasources,
    loadAgentDatasources,
    linkDatasource,
    unlinkDatasource,
  };
}
