import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token d'authentification depuis les headers
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    let userId: string | null = null;

    // Essayer de récupérer le token depuis les cookies Supabase
    let supabaseToken = null;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      supabaseToken = cookies['sb-access-token'] || cookies['sb-refresh-token'];
    }

    // Essayer aussi depuis le header Authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      supabaseToken = authHeader.substring(7);
    }

    if (supabaseToken) {
      // Vérifier le token avec Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseToken);
      
      if (!authError && user) {
        userId = user.id;
        console.log('User authenticated:', user.email);
      } else {
        console.error('Auth error:', authError);
      }
    }

    // Si pas d'utilisateur authentifié, utiliser un ID par défaut pour le développement
    if (!userId) {
      console.log('No authenticated user found, using default user');
      userId = '550e8400-e29b-41d4-a716-446655440000'; // Pour le développement
    }

    // Récupérer l'utilisateur depuis la table users
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, created_at')
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
              email: 'user@example.com'
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Create user error:', createError);
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        return NextResponse.json(newUser);
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 