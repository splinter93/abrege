import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
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

/**
 * PUT /api/v1/classeur/reorder
 * Réorganise les classeurs en mettant à jour leurs positions
 * Réponse : { success: true, message: string }
 */
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const { supabase, userId } = await getAuthenticatedClient(req);
    
    const body = await req.json();
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[reorderClasseurs] Payload reçu:', body);
    }
    
    const schema = z.object({
      classeurs: z.array(z.object({
        id: z.string().min(1, 'ID classeur requis'),
        position: z.number().min(0, 'Position doit être >= 0')
      })).min(1, 'Au moins un classeur requis')
    });
    
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[reorderClasseurs] Erreur de validation Zod:', parseResult.error.errors);
      }
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { classeurs } = parseResult.data;
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[reorderClasseurs] Réorganisation de', classeurs.length, 'classeurs pour user:', userId);
    }
    
    // Mettre à jour les positions des classeurs
    const updatePromises = classeurs.map(async ({ id, position }) => {
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[reorderClasseurs] 🔄 Mise à jour position classeur ${id} -> ${position}`);
      }
      
      const { error } = await supabase
        .from('classeurs')
        .update({ position })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.error(`[reorderClasseurs] ❌ Erreur mise à jour classeur ${id}:`, error);
        }
        throw new Error(`Erreur mise à jour classeur ${id}: ${error.message}`);
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[reorderClasseurs] ✅ Position mise à jour classeur ${id} -> ${position}`);
      }
      
      return { id, position };
    });
    
    const results = await Promise.all(updatePromises);
    
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[reorderClasseurs] ✅ Réorganisation terminée:', results.length, 'classeurs mis à jour');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${results.length} classeurs réorganisés avec succès`,
        classeurs: results
      }),
      { status: 200 }
    );
    
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    
    if (process.env.NODE_ENV === 'development') {
      logger.error('[reorderClasseurs] ❌ Erreur:', error);
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la réorganisation des classeurs',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500 }
    );
  }
} 