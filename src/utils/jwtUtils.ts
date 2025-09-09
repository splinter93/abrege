import jwt from 'jsonwebtoken';
import { logApi } from './logger';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error("❌ La variable d'environnement SUPABASE_JWT_SECRET ou JWT_SECRET est requise mais n'a pas été trouvée.");
  // Dans un environnement de production, vous pourriez vouloir arrêter le processus
  // throw new Error("SUPABASE_JWT_SECRET or JWT_SECRET is missing from environment variables.");
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
    logger.error("❌ Tentative de génération de JWT sans secret configuré.", { userId });
    return null;
  }
  
  if (!userId) {
    logger.warn("⚠️ Tentative de génération de JWT sans userId.");
    return null;
  }

  const payload = {
    sub: userId,
    // Vous pouvez ajouter d'autres claims pertinents si nécessaire
    // Par exemple, les rôles ou les scopes, mais pour l'instant on garde simple
    // 'https://hasura.io/jwt/claims': {
    //   'x-hasura-allowed-roles': ['user'],
    //   'x-hasura-default-role': 'user',
    //   'x-hasura-user-id': userId
    // }
  };

  const options: jwt.SignOptions = {
    expiresIn,
    // L'audience et l'émetteur doivent correspondre à votre configuration Supabase
    // pour que RLS fonctionne correctement. Consultez vos paramètres Supabase.
    // audience: 'authenticated', 
    // issuer: `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]}`
  };

  try {
    const token = jwt.sign(payload, JWT_SECRET, options);
    logApi.info(`🔑 JWT généré pour l'utilisateur ${userId.substring(0,8)}...`, { component: 'jwtUtils' });
    return token;
  } catch (error) {
    logger.error("❌ Erreur lors de la signature du JWT :", { error: error instanceof Error ? error.message : String(error), userId });
    return null;
  }
}
