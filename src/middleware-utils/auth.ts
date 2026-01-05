import { NextRequest } from 'next/server';
import { getAuthenticatedUser as getAuthUser } from '@/utils/authUtils';
import { logger, LogCategory } from '@/utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}

/**
 * Middleware d'authentification unifié qui gère API Keys, OAuth et JWT
 */
export async function authenticateUser(req: NextRequest): Promise<AuthResult> {
  try {
    logger.debug(LogCategory.API, '[AUTH] 🚨 ===== DÉBUT AUTHENTICATEUSER =====');
    
    // Utiliser la fonction unifiée d'authentification
    const authResult = await getAuthUser(req);
    
    if (!authResult.success) {
      logger.warn(LogCategory.API, '[AUTH] 🚨 ❌ Authentification échouée', {
        error: authResult.error
      });
      return { user: null, error: authResult.error || 'Authentification requise' };
    }
    
    // Récupérer le profil utilisateur complet depuis la base
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', authResult.userId)
      .single();

    if (profileError || !userProfile) {
      logger.error(LogCategory.API, '[AUTH] 🚨 ❌ Erreur récupération profil', {
        error: profileError?.message,
        userId: authResult.userId
      }, profileError || undefined);
      return { user: null, error: 'Profil utilisateur non trouvé' };
    }

    logger.info(LogCategory.API, '[AUTH] 🚨 ✅ Utilisateur authentifié', {
      email: userProfile.email,
      authType: authResult.authType
    });
    logger.debug(LogCategory.API, '[AUTH] 🚨 ===== FIN AUTHENTICATEUSER =====');

    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username
      }
    };

  } catch (error) {
    logger.error(LogCategory.API, '[AUTH] 🚨 ❌ Erreur inattendue', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error instanceof Error ? error : undefined);
    return { user: null, error: 'Erreur d\'authentification' };
  }
}

/**
 * Helper pour extraire l'utilisateur dans les endpoints
 */
export async function getCurrentUser(req: NextRequest): Promise<AuthenticatedUser> {
  const authResult = await authenticateUser(req);
  
  if (!authResult.user) {
    throw new Error(authResult.error || 'Authentification requise');
  }
  
  return authResult.user;
}

/**
 * Middleware pour les endpoints protégés
 */
export function withAuth(handler: (req: NextRequest, user: AuthenticatedUser, params?: Record<string, string>) => Promise<Response>) {
  return async (req: NextRequest, params?: Record<string, string>): Promise<Response> => {
    try {
      const user = await getCurrentUser(req);
      return await handler(req, user, params);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentification requise';
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: 'AUTH_REQUIRED'
        }), 
        { status: 401 }
      );
    }
  };
} 