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
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getAuthenticatedClient(request);
    
    // Récupérer l'utilisateur depuis la table users
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, name, surname, profile_picture, created_at')
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
              email: 'user@example.com',
              name: null,
              surname: null,
              profile_picture: null
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500 });
        }

        return new Response(JSON.stringify(newUser), { status: 200 });
      }

      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
} 