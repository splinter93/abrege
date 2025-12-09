import jwt from 'jsonwebtoken';
import { logApi } from './logger';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!JWT_SECRET) {
  logApi.error("❌ Aucune clé JWT trouvée. SUPABASE_JWT_SECRET, JWT_SECRET ou SUPABASE_SERVICE_ROLE_KEY requis.");
  // Dans un environnement de production, vous pourriez vouloir arrêter le processus
  // throw new Error("No JWT secret found in environment variables.");
}

/**
 * Génère un token JWT pour un utilisateur avec une courte durée de vie.
 * Ce token est utilisé pour les appels internes (tool calls) initiés par des agents
 * suite à une authentification externe (ex: API Key).
 *
 * @param userId - L'ID de l'utilisateur pour lequel générer le token.
 * @param expiresIn - La durée de validité du token (par défaut '15m').
 * @returns Le token JWT signé.
 */
export function generateUserJwt(userId: string, expiresIn: string | number = '15m'): string | null {
  if (!JWT_SECRET) {
    logApi.error("❌ Tentative de génération de JWT sans secret configuré.", { userId });
    return null;
  }
  
  if (!userId) {
    logApi.warn("⚠️ Tentative de génération de JWT sans userId.");
    return null;
  }

  const payload = {
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    iss: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hddhjwlaampspoqncubs.supabase.co'
  };

  const options: jwt.SignOptions = {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256'
  };

  try {
    const token = jwt.sign(payload, JWT_SECRET, options);
    logApi.info(`🔑 JWT généré pour l'utilisateur ${userId.substring(0,8)}...`, { component: 'jwtUtils' });
    return token;
  } catch (error) {
    logApi.error("❌ Erreur lors de la signature du JWT :", { error: error instanceof Error ? error.message : String(error), userId });
    return null;
  }
}
