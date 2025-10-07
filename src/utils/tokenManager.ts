/**
 * 🔐 TOKEN MANAGER - Gestion centralisée des tokens avec refresh automatique
 * 
 * Ce module gère le cycle de vie des tokens d'authentification:
 * - Validation de l'expiration
 * - Refresh automatique si nécessaire
 * - Cache intelligent pour éviter les appels redondants
 */

import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from './logger';

interface TokenInfo {
  token: string;
  expiresAt: number; // timestamp en secondes
  userId: string;
}

interface ValidatedToken {
  token: string;
  isValid: boolean;
  wasRefreshed: boolean;
  expiresAt?: number;
  userId?: string;
  error?: string;
}

/**
 * Token Manager avec cache et refresh automatique
 */
export class TokenManager {
  private static instance: TokenManager;
  private tokenCache: Map<string, TokenInfo> = new Map();
  private readonly REFRESH_THRESHOLD_SECONDS = 300; // Rafraîchir 5 min avant expiration
  private refreshInProgress = false;

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Valide un token et le rafraîchit si nécessaire
   * 
   * @param token - Token JWT à valider
   * @param forceRefresh - Forcer le rafraîchissement même si le token est valide
   * @returns Token validé et potentiellement rafraîchi
   */
  public async validateAndRefreshToken(
    token: string,
    forceRefresh: boolean = false
  ): Promise<ValidatedToken> {
    try {
      // 1. Vérifier si le token est dans le cache
      const cached = this.tokenCache.get(token);
      
      if (cached && !forceRefresh) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = cached.expiresAt - now;

        // Si le token est encore valide et pas proche de l'expiration, le retourner
        if (timeUntilExpiry > this.REFRESH_THRESHOLD_SECONDS) {
          logger.dev(`[TokenManager] ✅ Token valide depuis le cache (expire dans ${timeUntilExpiry}s)`);
          return {
            token: cached.token,
            isValid: true,
            wasRefreshed: false,
            expiresAt: cached.expiresAt,
            userId: cached.userId,
          };
        }

        logger.info(`[TokenManager] ⚠️ Token proche de l'expiration (${timeUntilExpiry}s), rafraîchissement...`);
      }

      // 2. Vérifier si un refresh est déjà en cours
      if (this.refreshInProgress) {
        logger.dev(`[TokenManager] ⏳ Refresh déjà en cours, attente...`);
        await this.waitForRefresh();
      }

      this.refreshInProgress = true;

      // 3. Obtenir la session Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        logger.error(`[TokenManager] ❌ Impossible d'obtenir la session:`, sessionError);
        this.refreshInProgress = false;
        return {
          token,
          isValid: false,
          wasRefreshed: false,
          error: 'Session non disponible',
        };
      }

      // 4. Vérifier si le token doit être rafraîchi
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      let finalToken = session.access_token;
      let wasRefreshed = false;

      if (timeUntilExpiry < this.REFRESH_THRESHOLD_SECONDS || forceRefresh) {
        logger.info(`[TokenManager] 🔄 Rafraîchissement du token (expire dans ${timeUntilExpiry}s)...`);
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          logger.error(`[TokenManager] ❌ Échec du rafraîchissement:`, refreshError);
          this.refreshInProgress = false;
          
          // Retourner le token actuel même s'il va bientôt expirer
          return {
            token: finalToken,
            isValid: true,
            wasRefreshed: false,
            expiresAt,
            userId: session.user.id,
            error: 'Refresh failed, using current token',
          };
        }

        finalToken = refreshData.session.access_token;
        wasRefreshed = true;
        
        logger.info(`[TokenManager] ✅ Token rafraîchi avec succès`);
        
        // Mettre à jour le cache avec le nouveau token
        this.tokenCache.set(finalToken, {
          token: finalToken,
          expiresAt: refreshData.session.expires_at || 0,
          userId: refreshData.session.user.id,
        });
      } else {
        // Token encore valide, le mettre en cache
        this.tokenCache.set(finalToken, {
          token: finalToken,
          expiresAt,
          userId: session.user.id,
        });
      }

      this.refreshInProgress = false;

      return {
        token: finalToken,
        isValid: true,
        wasRefreshed,
        expiresAt,
        userId: session.user.id,
      };

    } catch (error) {
      this.refreshInProgress = false;
      logger.error(`[TokenManager] ❌ Erreur validation/refresh:`, error);
      
      return {
        token,
        isValid: false,
        wasRefreshed: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Obtient un token valide et rafraîchi si nécessaire
   * Raccourci pour validateAndRefreshToken sans paramètre token initial
   */
  public async getValidToken(): Promise<ValidatedToken> {
    try {
      // ✅ Vérifier que Supabase est disponible
      if (!supabase || typeof window === 'undefined') {
        logger.warn(`[TokenManager] ⚠️ Supabase non disponible`);
        return {
          token: '',
          isValid: false,
          wasRefreshed: false,
          error: 'Supabase non disponible',
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logger.error(`[TokenManager] ❌ Erreur getSession:`, sessionError);
        return {
          token: '',
          isValid: false,
          wasRefreshed: false,
          error: sessionError.message,
        };
      }
      
      if (!session?.access_token) {
        logger.dev(`[TokenManager] ⚠️ Aucune session active`);
        return {
          token: '',
          isValid: false,
          wasRefreshed: false,
          error: 'Aucune session active',
        };
      }

      return await this.validateAndRefreshToken(session.access_token);
    } catch (error) {
      logger.error(`[TokenManager] ❌ Erreur getValidToken:`, error);
      return {
        token: '',
        isValid: false,
        wasRefreshed: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Nettoie le cache des tokens expirés
   */
  public cleanExpiredTokens(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    for (const [token, info] of this.tokenCache.entries()) {
      if (info.expiresAt < now) {
        this.tokenCache.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.dev(`[TokenManager] 🧹 ${cleaned} token(s) expiré(s) nettoyé(s)`);
    }
  }

  /**
   * Attend que le refresh en cours se termine
   */
  private async waitForRefresh(maxWait: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (this.refreshInProgress && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Vide complètement le cache
   */
  public clearCache(): void {
    this.tokenCache.clear();
    logger.dev(`[TokenManager] 🧹 Cache vidé`);
  }
}

// Export singleton
export const tokenManager = TokenManager.getInstance();

// Nettoyer le cache toutes les 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    tokenManager.cleanExpiredTokens();
  }, 5 * 60 * 1000);
}

