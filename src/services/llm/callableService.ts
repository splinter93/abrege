/**
 * Service de gestion des callables Synesia pour les agents
 * 
 * Architecture :
 * - Sync depuis Synesia API vers synesia_callables (DB)
 * - Liaison many-to-many agents <-> callables via agent_callables
 * - Cache avec TTL pour éviter spam API
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import type { CallableListItem, SynesiaCallable } from '@/types/callables';
import { getLLMConfig } from './config';

/**
 * Cache avec TTL pour les callables
 */
interface CallablesCache {
  data: SynesiaCallable[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Interface pour les erreurs Supabase
 */
interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Service de gestion des callables Synesia
 */
export class CallableService {
  private static instance: CallableService;
  private supabase: ReturnType<typeof createClient>;
  private cache: CallablesCache | null = null;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  static getInstance(): CallableService {
    if (!CallableService.instance) {
      CallableService.instance = new CallableService();
    }
    return CallableService.instance;
  }

  /**
   * Récupère l'API key et base URL depuis la config LLM
   * Utilise LIMINALITY_BASE_URL (origins-server.up.railway.app) pour l'endpoint /execution
   */
  private getApiConfig() {
    const config = getLLMConfig();
    const apiKey = config.providers.liminality.apiKey;
    // Utiliser LIMINALITY_BASE_URL (origins-server.up.railway.app)
    const baseUrl = config.providers.liminality.baseUrl;

    if (!apiKey) {
      throw new Error('LIMINALITY_API_KEY manquante dans la configuration');
    }

    if (!baseUrl) {
      throw new Error('LIMINALITY_BASE_URL manquante dans la configuration');
    }

    return { apiKey, baseUrl };
  }

  /**
   * Synchronise les callables depuis l'API Synesia vers la DB
   * Utilise upsert pour mettre à jour les callables existants
   */
  async syncCallablesFromSynesia(): Promise<SynesiaCallable[]> {
    try {
      logger.info('[CallableService] 🔄 Synchronisation callables depuis Synesia API');

      const { apiKey, baseUrl } = this.getApiConfig();

      const response = await fetch(`${baseUrl}/execution`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[CallableService] ❌ Erreur API Synesia:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Synesia API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as { data: CallableListItem[] };
      const callables = result.data || [];

      logger.info(`[CallableService] ✅ ${callables.length} callables récupérés depuis Synesia`);

      // Upsert dans la DB
      const now = new Date().toISOString();
      const upsertPromises = callables.map(async (callable) => {
        const upsertData = {
          id: callable.id,
          name: callable.name,
          type: callable.type,
          description: callable.description || null,
          slug: callable.slug || null,
          icon: callable.icon || null,
          group_name: callable.group_name || null,
          input_schema: callable.input_schema || null,
          output_schema: callable.output_schema || null,
          is_owner: callable.is_owner,
          auth: callable.auth,
          oauth_system_id: callable.oauth_system_id || null,
          last_synced_at: now,
          updated_at: now,
        };
        
        // Utiliser une assertion de type plus précise que any
        // Supabase ne peut pas inférer le type de la table dynamiquement
        // On utilise unknown puis on accède aux méthodes avec une interface inline
        const queryBuilder = this.supabase.from('synesia_callables') as unknown as {
          upsert: (data: typeof upsertData, options?: { onConflict?: string }) => Promise<{ error: unknown }>;
        };
        const { error } = await queryBuilder.upsert(upsertData, {
          onConflict: 'id',
        });

        if (error) {
          logger.error(`[CallableService] ❌ Erreur upsert callable ${callable.id}:`, error);
        }
      });

      await Promise.all(upsertPromises);

      // Invalider le cache
      this.cache = null;

      // Récupérer les callables depuis la DB
      const { data: syncedCallables, error: fetchError } = await this.supabase
        .from('synesia_callables')
        .select('*')
        .order('name');

      if (fetchError) {
        logger.error('[CallableService] ❌ Erreur récupération callables:', fetchError);
        throw fetchError;
      }

      logger.info(`[CallableService] ✅ ${syncedCallables?.length || 0} callables synchronisés en DB`);

      return (syncedCallables || []) as SynesiaCallable[];
    } catch (error) {
      logger.error('[CallableService] ❌ Erreur synchronisation callables:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les callables disponibles (depuis DB avec cache)
   */
  async getAvailableCallables(): Promise<SynesiaCallable[]> {
    const now = Date.now();

    // Vérifier le cache
    if (this.cache && (now - this.cache.timestamp) < CACHE_TTL_MS) {
      logger.dev(`[CallableService] ✅ Cache hit: ${this.cache.data.length} callables`);
      return this.cache.data;
    }

    try {
      // Récupérer depuis la DB
      const { data: callables, error } = await this.supabase
        .from('synesia_callables')
        .select('*')
        .order('name');

      if (error) {
        logger.error('[CallableService] ❌ Erreur récupération callables:', error);
        throw error;
      }

      const result = (callables || []) as SynesiaCallable[];

      // Mettre à jour le cache
      this.cache = {
        data: result,
        timestamp: now,
      };

      logger.dev(`[CallableService] ✅ ${result.length} callables récupérés depuis DB`);

      return result;
    } catch (error) {
      logger.error('[CallableService] ❌ Erreur récupération callables:', error);
      throw error;
    }
  }

  /**
   * Récupère les callables liés à un agent
   */
  async getCallablesForAgent(agentId: string): Promise<SynesiaCallable[]> {
    try {
      const { data: links, error } = await this.supabase
        .from('agent_callables')
        .select(`
          callable_id,
          synesia_callables (*)
        `)
        .eq('agent_id', agentId);

      if (error) {
        logger.error('[CallableService] ❌ Erreur récupération callables agent:', error);
        throw error;
      }

      const callables = (links || [])
        .map((link: { synesia_callables: unknown }) => link.synesia_callables as SynesiaCallable)
        .filter((c: SynesiaCallable | null): c is SynesiaCallable => c !== null);

      logger.dev(`[CallableService] ✅ ${callables.length} callables trouvés pour agent ${agentId}`);

      return callables;
    } catch (error) {
      logger.error('[CallableService] ❌ Erreur récupération callables agent:', error);
      throw error;
    }
  }

  /**
   * Lie un callable à un agent
   */
  async linkCallableToAgent(agentId: string, callableId: string): Promise<void> {
    try {
      // Vérifier que le callable existe
      const { data: callable, error: callableError } = await this.supabase
        .from('synesia_callables')
        .select('id')
        .eq('id', callableId)
        .single();

      if (callableError || !callable) {
        throw new Error(`Callable ${callableId} non trouvé`);
      }

      // Créer le lien
      // Utiliser une assertion de type plus précise que any
      // Supabase ne peut pas inférer le type de la table dynamiquement
      // On utilise unknown puis on accède aux méthodes avec une interface inline
      const queryBuilder = this.supabase.from('agent_callables') as unknown as {
        insert: (data: { agent_id: string; callable_id: string }) => Promise<{ error: SupabaseError | null }>;
      };
      const { error: linkError } = await queryBuilder.insert({
        agent_id: agentId,
        callable_id: callableId,
      });

      if (linkError) {
        // Si c'est une erreur de contrainte unique, c'est OK
        if (linkError.code === '23505') {
          logger.dev(`[CallableService] ⚠️ Callable ${callableId} déjà lié à l'agent ${agentId}`);
          return;
        }

        logger.error('[CallableService] ❌ Erreur liaison callable:', linkError);
        throw linkError;
      }

      logger.info(`[CallableService] ✅ Callable ${callableId} lié à l'agent ${agentId}`);
    } catch (error) {
      logger.error('[CallableService] ❌ Erreur liaison callable:', error);
      throw error;
    }
  }

  /**
   * Délie un callable d'un agent
   */
  async unlinkCallableFromAgent(agentId: string, callableId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('agent_callables')
        .delete()
        .eq('agent_id', agentId)
        .eq('callable_id', callableId);

      if (error) {
        logger.error('[CallableService] ❌ Erreur suppression liaison callable:', error);
        throw error;
      }

      logger.info(`[CallableService] ✅ Callable ${callableId} délié de l'agent ${agentId}`);
    } catch (error) {
      logger.error('[CallableService] ❌ Erreur suppression liaison callable:', error);
      throw error;
    }
  }
}

// Export de l'instance singleton
export const callableService = CallableService.getInstance();

