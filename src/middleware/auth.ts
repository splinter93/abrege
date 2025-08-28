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
    // 🚨 LOGS DÉTAILLÉS POUR DÉBOGUER CHATGPT
    console.log('🚨 [AUTH] ===== DÉBUT GETAUTHENTICATEDUSER =====');
    console.log('🚨 [AUTH] URL:', req.url);
    console.log('🚨 [AUTH] Méthode:', req.method);
    console.log('🚨 [AUTH] User-Agent:', req.headers.get('user-agent'));
    console.log('🚨 [AUTH] Content-Type:', req.headers.get('content-type'));
    console.log('🚨 [AUTH] Accept:', req.headers.get('accept'));
    
    // 🚨 LOGS COMPLETS DES HEADERS
    console.log('🚨 [AUTH] ===== TOUS LES HEADERS =====');
    req.headers.forEach((value, key) => {
      console.log(`🚨 [AUTH] ${key}:`, value);
    });
    console.log('🚨 [AUTH] ===== FIN HEADERS =====');
    
    // 🚨 LOGS DU BODY SI PRÉSENT
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const bodyText = await req.text();
        console.log('🚨 [AUTH] Body reçu:', bodyText);
        console.log('🚨 [AUTH] Taille du body:', bodyText.length);
        
        // Essayer de parser le JSON si possible
        try {
          const bodyJson = JSON.parse(bodyText);
          console.log('🚨 [AUTH] Body JSON parsé:', JSON.stringify(bodyJson, null, 2));
        } catch (parseError) {
          console.log('🚨 [AUTH] Body non-JSON, affichage brut');
        }
      } catch (bodyError) {
        console.log('🚨 [AUTH] Erreur lecture body:', bodyError);
      }
    }
    
    // Extraire le token depuis les headers
    const authHeader = req.headers.get('authorization');
    console.log('🚨 [AUTH] Header Authorization reçu:', authHeader || 'ABSENT');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🚨 [AUTH] ❌ Header Authorization manquant ou invalide');
      
      // 🚨 VÉRIFICATION ALTERNATIVE DES HEADERS
      const allHeaders = Array.from(req.headers.entries());
      const authVariants = allHeaders.filter(([key, value]) => 
        key.toLowerCase().includes('auth') || 
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('bearer')
      );
      
      if (authVariants.length > 0) {
        console.log('🚨 [AUTH] 🔍 Headers similaires trouvés:', authVariants);
      }
      
      // 🚨 VÉRIFICATION DES HEADERS PERSONNALISÉS CHATGPT
      const chatgptHeaders = allHeaders.filter(([key, value]) => 
        key.toLowerCase().includes('chatgpt') || 
        key.toLowerCase().includes('openai') ||
        key.toLowerCase().includes('gpt')
      );
      
      if (chatgptHeaders.length > 0) {
        console.log('🚨 [AUTH] 🔍 Headers ChatGPT trouvés:', chatgptHeaders);
      }
      
      return { user: null, error: 'Token d\'authentification manquant' };
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🚨 [AUTH] Token extrait (longueur):', token.length);
    console.log('🚨 [AUTH] Token début:', token.substring(0, 20) + '...');
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('🚨 [AUTH] ❌ Erreur validation token Supabase:', error);
      return { user: null, error: 'Token invalide ou expiré' };
    }

    console.log('🚨 [AUTH] ✅ Token validé pour utilisateur:', user.id);
    
    // Récupérer les informations utilisateur depuis la base
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.log('🚨 [AUTH] ❌ Erreur récupération profil:', profileError);
      return { user: null, error: 'Profil utilisateur non trouvé' };
    }

    console.log('🚨 [AUTH] ✅ Profil utilisateur récupéré:', userProfile.email);
    console.log('🚨 [AUTH] ===== FIN GETAUTHENTICATEDUSER =====');

    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username
      }
    };

  } catch (error) {
    console.error('🚨 [AUTH] ❌ Erreur inattendue:', error);
    logger.error('Erreur d\'authentification:', error);
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