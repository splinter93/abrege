import { createSupabaseClient } from '@/utils/supabaseClient';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';

export interface OAuthClient {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  redirect_uris: string[];
  scopes: string[];
  is_active: boolean;
}

export interface AuthorizationCode {
  id: string;
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scopes: string[];
  state?: string;
  expires_at: string;
  used_at?: string;
}

export interface AccessToken {
  id: string;
  token_hash: string;
  client_id: string;
  user_id: string;
  scopes: string[];
  expires_at: string;
  revoked_at?: string;
}

export interface RefreshToken {
  id: string;
  token_hash: string;
  access_token_id: string;
  client_id: string;
  user_id: string;
  expires_at: string;
  revoked_at?: string;
}

export class OAuthService {
  private supabase = createSupabaseClient();

  /**
   * Génère un code d'autorisation OAuth sécurisé
   */
  private generateAuthorizationCode(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Génère un access token sécurisé
   */
  private generateAccessToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Génère un refresh token sécurisé
   */
  private generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash un token pour le stockage sécurisé
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Vérifie les credentials client OAuth
   */
  async validateClientCredentials(clientId: string, clientSecret: string): Promise<OAuthClient | null> {
    try {
      const { data: client, error } = await this.supabase
        .from('oauth_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (error || !client) {
        return null;
      }

      // Vérifier le secret avec bcrypt
      const isValidSecret = await bcrypt.compare(clientSecret, client.client_secret_hash);
      if (!isValidSecret) {
        return null;
      }

      return client;
    } catch (error) {
      console.error('Erreur validation credentials client:', error);
      return null;
    }
  }

  /**
   * Récupère un client OAuth par son ID
   */
  async getClientById(clientId: string): Promise<OAuthClient | null> {
    try {
      console.log('🔍 [OAuthService] Récupération client par ID:', clientId);
      
      const { data: client, error } = await this.supabase
        .from('oauth_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (error || !client) {
        console.error('❌ [OAuthService] Client non trouvé ou inactif:', { error, client });
        return null;
      }

      console.log('🔍 [OAuthService] Client trouvé:', { 
        id: client.id, 
        name: client.name, 
        is_active: client.is_active,
        scopes_count: client.scopes?.length || 0,
        redirect_uris_count: client.redirect_uris?.length || 0
      });

      return client;
    } catch (error) {
      console.error('❌ [OAuthService] Erreur récupération client:', error);
      return null;
    }
  }

  /**
   * Vérifie si un redirect_uri est autorisé pour un client
   */
  async validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    try {
      console.log('🔍 [OAuthService] Validation redirect_uri:', { clientId, redirectUri });
      
      const { data: client, error } = await this.supabase
        .from('oauth_clients')
        .select('redirect_uris')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (error || !client) {
        console.error('❌ [OAuthService] Client non trouvé pour validation redirect_uri:', { error, client });
        return false;
      }

      console.log('🔍 [OAuthService] URIs autorisées:', client.redirect_uris);
      
      const isValid = client.redirect_uris.some((uri: string) => {
        // Support des wildcards
        if (uri.includes('*')) {
          const pattern = uri.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          const matches = regex.test(redirectUri);
          console.log(`🔍 [OAuthService] Pattern ${uri} -> ${pattern}: ${matches ? '✅' : '❌'}`);
          return matches;
        }
        // Sinon, validation exacte ou startsWith
        const matches = redirectUri.startsWith(uri);
        console.log(`🔍 [OAuthService] URI ${uri}: ${matches ? '✅' : '❌'}`);
        return matches;
      });

      console.log('🔍 [OAuthService] Résultat validation redirect_uri:', isValid);
      return isValid;
    } catch (error) {
      console.error('❌ [OAuthService] Erreur validation redirect_uri:', error);
      return false;
    }
  }

  /**
   * Vérifie si les scopes demandés sont autorisés pour un client
   */
  async validateScopes(clientId: string, requestedScopes: string[]): Promise<boolean> {
    try {
      console.log('🔍 [OAuthService] Validation des scopes:', { clientId, requestedScopes });
      
      const { data: client, error } = await this.supabase
        .from('oauth_clients')
        .select('scopes')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (error || !client) {
        console.error('❌ [OAuthService] Client non trouvé ou inactif:', { error, client });
        return false;
      }

      console.log('🔍 [OAuthService] Client trouvé avec scopes:', client.scopes);
      
      const allScopesValid = requestedScopes.every(scope => {
        const isValid = client.scopes.includes(scope);
        console.log(`🔍 [OAuthService] Scope ${scope}: ${isValid ? '✅' : '❌'}`);
        return isValid;
      });

      console.log('🔍 [OAuthService] Résultat validation scopes:', allScopesValid);
      return allScopesValid;
    } catch (error) {
      console.error('❌ [OAuthService] Erreur validation scopes:', error);
      return false;
    }
  }

  /**
   * Crée un code d'autorisation OAuth
   */
  async createAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scopes: string[],
    state?: string
  ): Promise<string> {
    try {
      const code = this.generateAuthorizationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { error } = await this.supabase
        .from('oauth_authorization_codes')
        .insert({
          code,
          client_id: clientId,
          user_id: userId,
          redirect_uri: redirectUri,
          scopes,
          state,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        throw new Error(`Erreur création code d'autorisation: ${error.message}`);
      }

      return code;
    } catch (error) {
      console.error('Erreur création code d\'autorisation:', error);
      throw error;
    }
  }

  /**
   * Valide et échange un code d'autorisation contre un access token
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ access_token: string; token_type: string; expires_in: number; scope: string; refresh_token?: string }> {
    try {
      // 1. Valider les credentials client
      const client = await this.validateClientCredentials(clientId, clientSecret);
      if (!client) {
        throw new Error('invalid_client');
      }

      // 2. Récupérer le code d'autorisation
      const { data: authCode, error: codeError } = await this.supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('code', code)
        .eq('client_id', clientId)
        .is('used_at', null)  // Utiliser .is() au lieu de .eq() pour NULL
        .gt('expires_at', new Date().toISOString())
        .single();

      if (codeError || !authCode) {
        throw new Error('invalid_grant');
      }

      // 3. Vérifier le redirect_uri
      if (authCode.redirect_uri !== redirectUri) {
        throw new Error('invalid_grant');
      }

      // 4. Marquer le code comme utilisé
      await this.supabase
        .from('oauth_authorization_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', authCode.id);

      // 5. Créer l'access token
      const accessToken = this.generateAccessToken();
      const tokenHash = this.hashToken(accessToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      const { data: tokenData, error: tokenError } = await this.supabase
        .from('oauth_access_tokens')
        .insert({
          token_hash: tokenHash,
          client_id: clientId,
          user_id: authCode.user_id,
          scopes: authCode.scopes,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tokenError || !tokenData) {
        throw new Error('server_error');
      }

      // 6. Créer le refresh token
      const refreshToken = this.generateRefreshToken();
      const refreshTokenHash = this.hashToken(refreshToken);
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

      await this.supabase
        .from('oauth_refresh_tokens')
        .insert({
          token_hash: refreshTokenHash,
          access_token_id: tokenData.id,
          client_id: clientId,
          user_id: authCode.user_id,
          expires_at: refreshExpiresAt.toISOString()
        });

      return {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600, // 1 heure
        scope: authCode.scopes.join(' '),
        refresh_token: refreshToken
      };
    } catch (error) {
      console.error('Erreur échange code contre token:', error);
      throw error;
    }
  }

  /**
   * Valide un access token
   */
  async validateAccessToken(token: string): Promise<{ user_id: string; scopes: string[]; client_id: string } | null> {
    try {
      const tokenHash = this.hashToken(token);

      const { data: tokenData, error } = await this.supabase
        .from('oauth_access_tokens')
        .select('user_id, scopes, client_id')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)  // Utiliser .is() au lieu de .eq() pour NULL
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !tokenData) {
        return null;
      }

      return {
        user_id: tokenData.user_id,
        scopes: tokenData.scopes,
        client_id: tokenData.client_id
      };
    } catch (error) {
      console.error('Erreur validation access token:', error);
      return null;
    }
  }

  /**
   * Révoque un access token
   */
  async revokeAccessToken(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);

      const { error } = await this.supabase
        .from('oauth_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur révocation access token:', error);
      return false;
    }
  }

  /**
   * Rafraîchit un access token avec un refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ access_token: string; token_type: string; expires_in: number; scope: string; refresh_token?: string }> {
    try {
      // 1. Valider les credentials client
      const client = await this.validateClientCredentials(clientId, clientSecret);
      if (!client) {
        throw new Error('invalid_client');
      }

      // 2. Valider le refresh token
      const refreshTokenHash = this.hashToken(refreshToken);

      const { data: refreshTokenData, error: refreshError } = await this.supabase
        .from('oauth_refresh_tokens')
        .select('*, oauth_access_tokens(*)')
        .eq('token_hash', refreshTokenHash)
        .eq('client_id', clientId)
        .is('revoked_at', null)  // Utiliser .is() au lieu de .eq() pour NULL
        .gt('expires_at', new Date().toISOString())
        .single();

      if (refreshError || !refreshTokenData) {
        throw new Error('invalid_grant');
      }

      // 3. Révoquer l'ancien access token
      await this.revokeAccessToken(refreshTokenData.oauth_access_tokens.token_hash);

      // 4. Créer un nouveau access token
      const accessToken = this.generateAccessToken();
      const tokenHash = this.hashToken(accessToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      const { data: tokenData, error: tokenError } = await this.supabase
        .from('oauth_access_tokens')
        .insert({
          token_hash: tokenHash,
          client_id: clientId,
          user_id: refreshTokenData.user_id,
          scopes: refreshTokenData.oauth_access_tokens.scopes,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (tokenError || !tokenData) {
        throw new Error('server_error');
      }

      // 5. Créer un nouveau refresh token
      const newRefreshToken = this.generateRefreshToken();
      const newRefreshTokenHash = this.hashToken(newRefreshToken);
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

      await this.supabase
        .from('oauth_refresh_tokens')
        .insert({
          token_hash: newRefreshTokenHash,
          access_token_id: tokenData.id,
          client_id: clientId,
          user_id: refreshTokenData.user_id,
          expires_at: refreshExpiresAt.toISOString()
        });

      // 6. Révoquer l'ancien refresh token
      await this.supabase
        .from('oauth_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', refreshTokenData.id);

      return {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600, // 1 heure
        scope: refreshTokenData.oauth_access_tokens.scopes.join(' '),
        refresh_token: newRefreshToken
      };
    } catch (error) {
      console.error('Erreur rafraîchissement access token:', error);
      throw error;
    }
  }

  /**
   * Nettoie les données OAuth expirées
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      await this.supabase.rpc('cleanup_expired_oauth_data');
    } catch (error) {
      console.error('Erreur nettoyage données OAuth:', error);
    }
  }
}

// Instance singleton du service OAuth
export const oauthService = new OAuthService();
