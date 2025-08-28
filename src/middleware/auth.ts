import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
 * Middleware d'authentification pour extraire l'utilisateur depuis le token JWT
 */
export async function authenticateUser(req: NextRequest): Promise<AuthResult> {
  try {
    console.log('🚨 [AUTH] ===== DÉBUT GETAUTHENTICATEDUSER =====');
    console.log('🚨 [AUTH] URL:', req.url);
    console.log('🚨 [AUTH] Méthode:', req.method);
    
    // ✅ LOGS COMPLETS : Capturer tous les headers
    console.log('🚨 [AUTH] Tous les headers reçus:');
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('🚨 [AUTH] Headers complets:', JSON.stringify(allHeaders, null, 2));
    
    // Extraire le token depuis les headers
    const authHeader = req.headers.get('authorization');
    console.log('🚨 [AUTH] Header Authorization reçu:', authHeader ? `"${authHeader}"` : 'ABSENT');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚨 [AUTH] ❌ Header Authorization manquant ou invalide');
      console.log('🚨 [AUTH] Format attendu: "Bearer <token>"');
      console.log('🚨 [AUTH] Format reçu:', authHeader ? `"${authHeader}"` : 'ABSENT');
      console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER (ÉCHEC) =====');
      return { user: null, error: 'Token d\'authentification manquant' };
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🚨 [AUTH] Token extrait (longueur):', token.length);
    console.log('🚨 [AUTH] Token (premiers 20 caractères):', token.substring(0, 20) + '...');
    
    // Vérifier le token avec Supabase
    console.log('🚨 [AUTH] Vérification du token avec Supabase...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('🚨 [AUTH] ❌ Erreur Supabase ou utilisateur non trouvé:', error);
      console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER (ÉCHEC) =====');
      return { user: null, error: 'Token invalide ou expiré' };
    }

    console.log('🚨 [AUTH] ✅ Token Supabase valide, utilisateur:', user.id);
    
    // Récupérer les informations utilisateur depuis la base
    console.log('🚨 [AUTH] Récupération du profil utilisateur...');
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.log('🚨 [AUTH] ❌ Profil utilisateur non trouvé:', profileError);
      console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER (ÉCHEC) =====');
      return { user: null, error: 'Profil utilisateur non trouvé' };
    }

    console.log('🚨 [AUTH] ✅ Profil utilisateur récupéré:', { 
      id: userProfile.id, 
      email: userProfile.email, 
      username: userProfile.username 
    });
    console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER (SUCCÈS) =====');
    
    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username
      }
    };

  } catch (error) {
    console.error('🚨 [AUTH] ❌ Erreur d\'authentification:', error);
    console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER (ERREUR) =====');
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