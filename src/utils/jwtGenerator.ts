/**
 * Générateur de JWT pour l'authentification des agents
 * Génère des JWT valides pour les utilisateurs authentifiés via clés d'API
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client Supabase avec Service Role pour générer les JWT
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Génère un JWT valide pour un utilisateur
 * Utilisé quand une clé d'API est utilisée pour l'authentification
 */
export async function generateUserJWT(userId: string): Promise<string | null> {
  try {
    logger.info(`[JWTGenerator] 🔑 Génération JWT pour utilisateur: ${userId}`);

    // Vérifier que l'utilisateur existe
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      logger.error(`[JWTGenerator] ❌ Utilisateur non trouvé: ${userId}`, userError);
      return null;
    }

    // Générer un JWT temporaire pour l'utilisateur
    const { data: jwtData, error: jwtError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (jwtError || !jwtData) {
      logger.error(`[JWTGenerator] ❌ Erreur génération JWT:`, jwtError);
      return null;
    }

    // Extraire le token de l'URL de magic link
    const url = new URL(jwtData.properties.action_link);
    const token = url.searchParams.get('token');
    
    if (!token) {
      logger.error(`[JWTGenerator] ❌ Token non trouvé dans l'URL de magic link`);
      return null;
    }

    logger.info(`[JWTGenerator] ✅ JWT généré avec succès pour: ${userId}`);
    return token;

  } catch (error) {
    logger.error(`[JWTGenerator] ❌ Erreur fatale génération JWT:`, error);
    return null;
  }
}

/**
 * Génère un JWT simple pour les agents (alternative plus fiable)
 * Utilise une approche directe sans magic link
 */
export async function generateAgentJWT(userId: string): Promise<string | null> {
  try {
    logger.info(`[JWTGenerator] 🤖 Génération JWT agent pour: ${userId}`);

    // Créer un client Supabase avec l'utilisateur spécifique
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `agent-${userId}@scrivia.internal`, // Email temporaire pour l'agent
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (sessionError || !sessionData) {
      logger.error(`[JWTGenerator] ❌ Erreur génération session agent:`, sessionError);
      return null;
    }

    // Extraire le token
    const url = new URL(sessionData.properties.action_link);
    const token = url.searchParams.get('token');
    
    if (!token) {
      logger.error(`[JWTGenerator] ❌ Token agent non trouvé`);
      return null;
    }

    logger.info(`[JWTGenerator] ✅ JWT agent généré pour: ${userId}`);
    return token;

  } catch (error) {
    logger.error(`[JWTGenerator] ❌ Erreur génération JWT agent:`, error);
    return null;
  }
}

/**
 * Génère un JWT temporaire pour les agents
 * Alternative plus simple pour les agents qui n'ont pas besoin de session complète
 */
export async function generateAgentJWT(userId: string): Promise<string | null> {
  try {
    logger.info(`[JWTGenerator] 🤖 Génération JWT agent pour: ${userId}`);

    // Créer un client Supabase avec l'utilisateur spécifique
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `agent-${userId}@scrivia.internal`, // Email temporaire pour l'agent
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (sessionError || !sessionData) {
      logger.error(`[JWTGenerator] ❌ Erreur génération session agent:`, sessionError);
      return null;
    }

    // Extraire le token
    const url = new URL(sessionData.properties.action_link);
    const token = url.searchParams.get('token');
    
    if (!token) {
      logger.error(`[JWTGenerator] ❌ Token agent non trouvé`);
      return null;
    }

    logger.info(`[JWTGenerator] ✅ JWT agent généré pour: ${userId}`);
    return token;

  } catch (error) {
    logger.error(`[JWTGenerator] ❌ Erreur génération JWT agent:`, error);
    return null;
  }
}

/**
 * Valide un JWT et retourne l'utilisateur associé
 */
export async function validateJWT(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const supabaseWithToken = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error } = await supabaseWithToken.auth.getUser();
    
    if (error || !user) {
      logger.warn(`[JWTGenerator] ⚠️ JWT invalide:`, error);
      return null;
    }

    return {
      userId: user.id,
      email: user.email || ''
    };

  } catch (error) {
    logger.error(`[JWTGenerator] ❌ Erreur validation JWT:`, error);
    return null;
  }
}

/**
 * Génère un JWT simple pour les tests et le développement
 * ATTENTION: Ne pas utiliser en production
 */
export function generateTestJWT(userId: string): string {
  // Pour les tests, on peut utiliser un JWT simple
  // En production, utiliser generateUserJWT ou generateAgentJWT
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 heure
    iss: supabaseUrl
  };

  // Encoder en base64
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Signature simple (ne pas utiliser en production)
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.secret`).toString('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
