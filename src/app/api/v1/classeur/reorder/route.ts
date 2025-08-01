import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PUT /api/v1/classeur/reorder
 * Réorganise les classeurs en mettant à jour leurs positions
 * Réponse : { success: true, message: string }
 */
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[reorderClasseurs] Payload reçu:', body);
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
        console.log('[reorderClasseurs] Erreur de validation Zod:', parseResult.error.errors);
      }
      return new Response(
        JSON.stringify({ error: 'Payload invalide', details: parseResult.error.errors.map(e => e.message) }),
        { status: 422 }
      );
    }
    
    const { classeurs } = parseResult.data;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[reorderClasseurs] Réorganisation de', classeurs.length, 'classeurs pour user:', USER_ID);
    }
    
    // Mettre à jour les positions des classeurs
    const updatePromises = classeurs.map(async ({ id, position }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[reorderClasseurs] 🔄 Mise à jour position classeur ${id} -> ${position}`);
      }
      
      const { error } = await supabase
        .from('classeurs')
        .update({ position })
        .eq('id', id)
        .eq('user_id', USER_ID);
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[reorderClasseurs] ❌ Erreur mise à jour classeur ${id}:`, error);
        }
        throw new Error(`Erreur mise à jour classeur ${id}: ${error.message}`);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[reorderClasseurs] ✅ Position mise à jour classeur ${id} -> ${position}`);
      }
      
      return { id, position };
    });
    
    const results = await Promise.all(updatePromises);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[reorderClasseurs] ✅ Réorganisation terminée:', results.length, 'classeurs mis à jour');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${results.length} classeurs réorganisés avec succès`,
        classeurs: results
      }),
      { status: 200 }
    );
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[reorderClasseurs] ❌ Erreur:', error);
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