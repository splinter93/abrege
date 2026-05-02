/**
 * Datasources Synesia : sync GET /datasources/available → synesia_datasources, liaisons agent_datasources
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';
import type { SynesiaDatasource, SynesiaDatasourceApiItem } from '@/types/datasources';
import { getLLMConfig } from './config';

const apiItemSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  customization: z.unknown().nullable().optional(),
});

interface DatasourcesCache {
  data: SynesiaDatasource[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function parseDatasourceArray(raw: unknown): SynesiaDatasourceApiItem[] {
  if (!Array.isArray(raw)) {
    logger.warn('[DatasourceService] Réponse Synesia inattendue : tableau attendu');
    return [];
  }
  const out: SynesiaDatasourceApiItem[] = [];
  for (const row of raw) {
    const parsed = apiItemSchema.safeParse(row);
    if (!parsed.success) {
      logger.warn('[DatasourceService] Élément datasource ignoré (validation):', parsed.error.flatten());
      continue;
    }
    const d = parsed.data;
    out.push({
      id: d.id,
      project_id: d.project_id,
      type: d.type,
      name: d.name,
      description: d.description ?? null,
      customization: d.customization !== undefined ? d.customization : null,
    });
  }
  return out;
}

export class DatasourceService {
  private static instance: DatasourceService;
  private supabase: ReturnType<typeof createClient>;
  private cache: DatasourcesCache | null = null;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  static getInstance(): DatasourceService {
    if (!DatasourceService.instance) {
      DatasourceService.instance = new DatasourceService();
    }
    return DatasourceService.instance;
  }

  /**
   * URL datasources : SYNESIA_DATASOURCES_BASE_URL si défini (TLS valide / même prod que l’API publique),
   * sinon SYNESIA_BASE_URL. Permet de contourner un domaine dont le certificat est expiré.
   */
  private getApiConfig() {
    const config = getLLMConfig();
    const apiKey = config.providers.synesia.apiKey;
    const baseUrl =
      process.env.SYNESIA_DATASOURCES_BASE_URL?.trim() || config.providers.synesia.baseUrl;

    if (!apiKey) {
      throw new Error('SYNESIA_API_KEY manquante dans la configuration');
    }

    if (!baseUrl) {
      throw new Error('SYNESIA_BASE_URL ou SYNESIA_DATASOURCES_BASE_URL manquante dans la configuration');
    }

    return { apiKey, baseUrl };
  }

  /**
   * Sync depuis Synesia (corps = tableau JSON direct, pas { data: … })
   */
  async syncDatasourcesFromSynesia(): Promise<SynesiaDatasource[]> {
    logger.info('[DatasourceService] Synchronisation datasources depuis Synesia API');

    const { apiKey, baseUrl } = this.getApiConfig();
    const url = `${baseUrl.replace(/\/$/, '')}/datasources/available`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      const cause = err instanceof Error && 'cause' in err ? (err as Error & { cause?: { code?: string } }).cause : undefined;
      const code = cause && typeof cause === 'object' && 'code' in cause ? String((cause as { code?: string }).code) : '';
      const msg = err instanceof Error ? err.message : String(err);
      if (code === 'CERT_HAS_EXPIRED' || msg.includes('certificate') || msg.includes('CERT')) {
        throw new Error(
          'Certificat TLS expiré ou invalide pour l’API Synesia (datasources). Renouvelez le certificat du domaine configuré dans SYNESIA_BASE_URL, ou définissez SYNESIA_DATASOURCES_BASE_URL vers un hôte avec TLS valide (ex. https://origins-server.up.railway.app).'
        );
      }
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[DatasourceService] Erreur API Synesia:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Synesia API error: ${response.status} ${response.statusText}`);
    }

    const raw = await response.json() as unknown;
    const items = parseDatasourceArray(raw);

    logger.info(`[DatasourceService] ${items.length} datasources récupérés depuis Synesia`);

    const now = new Date().toISOString();
    const upsertPromises = items.map(async (ds) => {
      const upsertData = {
        id: ds.id,
        project_id: ds.project_id,
        type: ds.type,
        name: ds.name,
        description: ds.description,
        customization: ds.customization,
        last_synced_at: now,
        updated_at: now,
      };

      const queryBuilder = this.supabase.from('synesia_datasources') as unknown as {
        upsert: (data: typeof upsertData, options?: { onConflict?: string }) => Promise<{ error: unknown }>;
      };
      const { error } = await queryBuilder.upsert(upsertData, {
        onConflict: 'id',
      });

      if (error) {
        logger.error(`[DatasourceService] Erreur upsert datasource ${ds.id}:`, error);
      }
    });

    await Promise.all(upsertPromises);

    this.cache = null;

    const { data: synced, error: fetchError } = await this.supabase
      .from('synesia_datasources')
      .select('*')
      .order('name', { ascending: true })
      .order('id', { ascending: true });

    if (fetchError) {
      logger.error('[DatasourceService] Erreur récupération datasources:', fetchError);
      throw fetchError;
    }

    logger.info(`[DatasourceService] ${synced?.length || 0} datasources synchronisés en DB`);

    return (synced || []) as SynesiaDatasource[];
  }

  async getAvailableDatasources(): Promise<SynesiaDatasource[]> {
    const now = Date.now();

    if (this.cache && now - this.cache.timestamp < CACHE_TTL_MS) {
      logger.dev(`[DatasourceService] Cache hit: ${this.cache.data.length} datasources`);
      return this.cache.data;
    }

    const { data: rows, error } = await this.supabase
      .from('synesia_datasources')
      .select('*')
      .order('name', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      logger.error('[DatasourceService] Erreur récupération datasources:', error);
      throw error;
    }

    const result = (rows || []) as SynesiaDatasource[];

    this.cache = {
      data: result,
      timestamp: now,
    };

    logger.dev(`[DatasourceService] ${result.length} datasources depuis DB`);

    return result;
  }
}

export const datasourceService = DatasourceService.getInstance();
