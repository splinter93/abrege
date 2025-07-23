import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    // Extraire le token depuis les headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Token d\'authentification manquant' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Token invalide ou expiré' };
    }

    // Récupérer les informations utilisateur depuis la base
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { user: null, error: 'Profil utilisateur non trouvé' };
    }

    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username
      }
    };

  } catch (error) {
    console.error('Erreur d\'authentification:', error);
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
export function withAuth(handler: (req: NextRequest, user: AuthenticatedUser, params?: any) => Promise<Response>) {
  return async (req: NextRequest, params?: any): Promise<Response> => {
    try {
      const user = await getCurrentUser(req);
      return await handler(req, user, params);
    } catch (error: any) {
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Authentification requise',
          code: 'AUTH_REQUIRED'
        }), 
        { status: 401 }
      );
    }
  };
} 