import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let userId: string;
  let userToken: string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userToken = authHeader.substring(7);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Token invalide ou expiré');
    }
    
    userId = user.id;
    const userEmail = user.email; // Récupérer l'email depuis l'auth
    
    // Récupérer les informations d'authentification
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    let authProvider = 'email'; // Par défaut
    
    if (!sessionError && session?.user?.app_metadata?.provider) {
      authProvider = session.user.app_metadata.provider;
    } else if (session?.user?.identities && session.user.identities.length > 0) {
      // Essayer de détecter le provider depuis les identités
      const identity = session.user.identities[0];
      if (identity.provider) {
        authProvider = identity.provider;
      }
    }
    
    return { supabase, userId, authProvider, userEmail };
  } else {
    throw new Error('Authentification requise');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId, authProvider, userEmail } = await getAuthenticatedClient(request);
    
    // Récupérer l'utilisateur depuis la table users
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, name, surname, profile_picture, auth_provider, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Si l'utilisateur n'existe pas, créer un utilisateur par défaut
      if (error.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: userId,
              username: 'User',
              email: userEmail || 'user@example.com', // Utiliser l'email de l'auth
              name: null,
              surname: null,
              profile_picture: null,
              auth_provider: authProvider
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify(newUser), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Mettre à jour le provider d'authentification et l'email si différents
    const updates: Record<string, unknown> = {};
    
    if (user.auth_provider !== authProvider) {
      updates.auth_provider = authProvider;
    }
    
    if (userEmail && user.email !== userEmail) {
      updates.email = userEmail;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
      
      if (!updateError) {
        // Mettre à jour l'objet user pour la réponse
        Object.assign(user, updates);
      }
    }

    return new Response(JSON.stringify(user), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
} 