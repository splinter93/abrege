import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { SlugGenerator } from '@/utils/slugGenerator';
import { simpleLogger as logger } from '@/utils/logger';

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

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getAuthenticatedClient(request);
    
    const body = await request.json();
    const schema = z.object({
      name: z.string().min(1, 'Nom requis'),
      icon: z.string().optional(),
      position: z.number().optional()
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { name, icon, position } = parseResult.data;
    
    // Générer un slug unique
    const slug = await SlugGenerator.generateSlug(name, 'classeur', userId);
    
    // Créer le classeur
    const { data: classeur, error } = await supabase
      .from('classeurs')
      .insert({
        name,
        emoji: icon || '📁',
        position: position || 0,
        user_id: userId,
        slug
      })
      .select()
      .single();

    if (error) {
      logger.error('[API] ❌ Erreur création classeur:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    logger.dev('[API] ✅ Classeur créé:', classeur.name);
    return new Response(
      JSON.stringify({ classeur }),
      { status: 201 }
    );

  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    
    logger.error('[API] ❌ Erreur serveur création classeur:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500 }
    );
  }
} 