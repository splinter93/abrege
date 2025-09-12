import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

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
      console.error('❌ Erreur création API Key:', error);
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
        console.log('🔧 [ApiKeyService] Clé API non trouvée ou inactive:', error?.message);
        return null;
      }

      // Vérifier l'expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log('🔧 [ApiKeyService] Clé API expirée:', data.expires_at);
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

      console.log('✅ [ApiKeyService] Clé API validée:', {
        userId: info.user_id,
        scopes: info.scopes,
        name: info.api_key_name
      });

      return info;

    } catch (error) {
      console.error('❌ [ApiKeyService] Erreur validation API Key:', error);
      return null;
    }
  }

  /**
   * Liste toutes les API Keys d'un utilisateur
   */
  static async listUserApiKeys(userId: string): Promise<Omit<ApiKeyInfo, 'user_id'>[]> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('api_key_name, scopes, is_active, last_used_at, expires_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erreur récupération API Keys: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erreur liste API Keys:', error);
      throw error;
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
      console.error('❌ Erreur désactivation API Key:', error);
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
      console.error('❌ Erreur suppression API Key:', error);
      throw error;
    }
  }
}
