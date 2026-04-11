import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import { logger, LogCategory } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client Supabase avec service role pour accéder aux API Keys
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ApiKeyInfo {
  user_id: string;
  scopes: string[];
  api_key_name: string;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
}

/** Ligne renvoyée par `listUserApiKeys` (sans `user_id`). */
export interface ListedUserApiKey {
  id: string;
  api_key_name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface CreateApiKeyRequest {
  user_id: string;
  api_key_name: string;
  scopes?: string[];
  expires_at?: string;
}

/**
 * Service de gestion des API Keys utilisateurs
 */
export class ApiKeyService {
  
  /**
   * Génère une nouvelle API Key sécurisée
   */
  static generateApiKey(): string {
    // Générer 32 bytes aléatoires et les convertir en hex
    const randomBytesBuffer = randomBytes(32);
    return `scrivia_${randomBytesBuffer.toString('hex')}`;
  }

  /**
   * Hash une API Key pour le stockage sécurisé
   */
  static hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Crée une nouvelle API Key pour un utilisateur
   */
  static async createApiKey(request: CreateApiKeyRequest): Promise<{ apiKey: string; info: ApiKeyInfo }> {
    try {
      // Générer une nouvelle clé
      const apiKey = this.generateApiKey();
      const apiKeyHash = this.hashApiKey(apiKey);

      // Scopes par défaut si non spécifiés
      const scopes = request.scopes || [
        'notes:read', 'notes:write', 
        'dossiers:read', 'dossiers:write', 
        'classeurs:read', 'classeurs:write'
      ];

      // Insérer dans la base de données
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: request.user_id,
          api_key_hash: apiKeyHash,
          api_key_name: request.api_key_name,
          scopes: scopes,
          expires_at: request.expires_at || null
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur création API Key: ${error.message}`);
      }

      const info: ApiKeyInfo = {
        user_id: data.user_id,
        scopes: data.scopes,
        api_key_name: data.api_key_name,
        is_active: data.is_active,
        last_used_at: data.last_used_at,
        expires_at: data.expires_at
      };

      return { apiKey, info };

    } catch (error) {
      logger.error(LogCategory.API, '[ApiKeyService] ❌ Erreur création API Key', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Valide une API Key et retourne les informations utilisateur
   */
  static async validateApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
    try {
      const apiKeyHash = this.hashApiKey(apiKey);

      // Rechercher la clé dans la base de données avec le service role
      // pour contourner les restrictions RLS
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('api_key_hash', apiKeyHash)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        logger.debug(LogCategory.API, '[ApiKeyService] 🔧 Clé API non trouvée ou inactive', {
          error: error?.message
        });
        return null;
      }

      // Vérifier l'expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        logger.debug(LogCategory.API, '[ApiKeyService] 🔧 Clé API expirée', {
          expiresAt: data.expires_at
        });
        return null;
      }

      // Mettre à jour last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      const info: ApiKeyInfo = {
        user_id: data.user_id,
        scopes: data.scopes,
        api_key_name: data.api_key_name,
        is_active: data.is_active,
        last_used_at: data.last_used_at,
        expires_at: data.expires_at
      };

      logger.info(LogCategory.API, '[ApiKeyService] ✅ Clé API validée', {
        userId: info.user_id,
        scopes: info.scopes,
        name: info.api_key_name
      });

      return info;

    } catch (error) {
      logger.error(LogCategory.API, '[ApiKeyService] ❌ Erreur validation API Key', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Liste toutes les API Keys d'un utilisateur
   */
  static async listUserApiKeys(userId: string): Promise<ListedUserApiKey[]> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, api_key_name, scopes, is_active, last_used_at, expires_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erreur récupération API Keys: ${error.message}`);
      }

      return (data || []) as ListedUserApiKey[];

    } catch (error) {
      logger.error(LogCategory.API, '[ApiKeyService] ❌ Erreur liste API Keys', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Met à jour nom et/ou scopes d'une clé appartenant à l'utilisateur.
   */
  static async updateUserApiKey(
    userId: string,
    id: string,
    updates: { api_key_name?: string; scopes?: string[] }
  ): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (updates.api_key_name !== undefined) {
      const n = updates.api_key_name.trim();
      if (!n) {
        throw new Error('Nom de clé invalide');
      }
      patch.api_key_name = n;
    }
    if (updates.scopes !== undefined) {
      if (!Array.isArray(updates.scopes) || updates.scopes.length === 0) {
        throw new Error('Au moins une permission (scope) est requise');
      }
      patch.scopes = updates.scopes;
    }
    if (Object.keys(patch).length === 0) {
      return;
    }

    const { error } = await supabase
      .from('api_keys')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur mise à jour API Key: ${error.message}`);
    }
  }

  /**
   * Désactive une API Key
   */
  static async deactivateApiKey(userId: string, apiKeyName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('api_key_name', apiKeyName);

      if (error) {
        throw new Error(`Erreur désactivation API Key: ${error.message}`);
      }

      return true;

    } catch (error) {
      logger.error(LogCategory.API, '[ApiKeyService] ❌ Erreur désactivation API Key', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Supprime une API Key
   */
  static async deleteApiKey(userId: string, apiKeyName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('api_key_name', apiKeyName);

      if (error) {
        throw new Error(`Erreur suppression API Key: ${error.message}`);
      }

      return true;

    } catch (error) {
      logger.error(LogCategory.API, '[ApiKeyService] ❌ Erreur suppression API Key', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Supprime une API Key par identifiant (préféré côté UI).
   */
  static async deleteUserApiKeyById(userId: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('id', id);

      if (error) {
        throw new Error(`Erreur suppression API Key: ${error.message}`);
      }
    } catch (error) {
      logger.error(LogCategory.API, '[ApiKeyService] ❌ Erreur suppression API Key (id)', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }, error instanceof Error ? error : undefined);
      throw error;
    }
  }
}
