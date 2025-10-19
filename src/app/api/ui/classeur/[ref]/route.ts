import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const userIdHeader = req.headers.get('x-user-id');
  const serviceRoleHeader = req.headers.get('x-service-role');
  
  let userId: string;
  let supabase: ReturnType<typeof createClient>;

  // ✅ GESTION IMPERSONATION : Vérifier si c'est un appel avec Service Role
  if (serviceRoleHeader === 'true' && userIdHeader) {
    // Mode impersonation pour les clés d'API
    userId = userIdHeader;
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    logger.dev(`[getAuthenticatedClient] 🔑 Mode impersonation pour utilisateur: ${userId}`);
    return { supabase, userId };
  }

  // Mode JWT standard
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userToken = authHeader.substring(7);
    
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    logger.dev(`[getAuthenticatedClient] 🔑 Mode JWT pour utilisateur: ${userId}`);
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<Response> {
  try {
    const { ref } = await params;
    const classeurId = ref;
    
    // Validation du paramètre
    const paramSchema = z.object({ ref: z.string().min(1, 'classeur_ref requis') });
    const paramResult = paramSchema.safeParse({ ref });
    if (!paramResult.success) {
      return NextResponse.json(
        { error: 'Paramètre classeur_ref invalide', details: paramResult.error.errors.map(e => e.message) },
        { status: 422 }
      );
    }
    
    const body = await request.json();
    const bodySchema = z.object({
      name: z.string().optional(),
      emoji: z.string().optional(),
      color: z.string().optional(),
      position: z.number().optional()
    });
    
    const bodyResult = bodySchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Payload invalide', details: bodyResult.error.errors.map(e => e.message) },
        { status: 422 }
      );
    }
    
    const { name, emoji, color, position } = bodyResult.data;

    // Validation des données
    if (!name && !emoji && !color && position === undefined) {
      return NextResponse.json(
        { error: 'Au moins un champ à mettre à jour est requis' },
        { status: 400 }
      );
    }

    const { supabase, userId } = await getAuthenticatedClient(request);

    // Vérifier que le classeur appartient à l'utilisateur
    const { data: existingClasseur, error: fetchError } = await supabase
      .from('classeurs')
      .select('id')
      .eq('id', classeurId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingClasseur) {
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    // Préparer les données à mettre à jour
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (emoji) updateData.emoji = emoji;
    if (color) updateData.color = color;
    if (position !== undefined) updateData.position = position;

    // Mettre à jour le classeur
    const { data: classeur, error } = await supabase
      .from('classeurs')
      .update(updateData)
      .eq('id', classeurId)
      .select()
      .single();

    if (error) {
      logger.error('[API] ❌ Erreur mise à jour classeur:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!classeur) {
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    logger.dev('[API] ✅ Classeur mis à jour:', classeur.name);
    return NextResponse.json({ classeur });

  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return NextResponse.json({ error: error.message }, { status: 401, headers: { "Content-Type": "application/json" } });
    }
    logger.error('[API] ❌ Erreur serveur mise à jour classeur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
): Promise<Response> {
  try {
    const { ref } = await params;
    const classeurId = ref;

    const { supabase, userId } = await getAuthenticatedClient(request);

    // Vérifier que le classeur appartient à l'utilisateur
    const { data: existingClasseur, error: fetchError } = await supabase
      .from('classeurs')
      .select('id')
      .eq('id', classeurId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingClasseur) {
      return NextResponse.json(
        { error: 'Classeur non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le classeur
    const { error } = await supabase
      .from('classeurs')
      .delete()
      .eq('id', classeurId);

    if (error) {
      logger.error('[API] ❌ Erreur suppression classeur:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    logger.dev('[API] ✅ Classeur supprimé:', classeurId);
    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Token invalide ou expiré' || error.message === 'Authentification requise') {
      return NextResponse.json({ error: error.message }, { status: 401, headers: { "Content-Type": "application/json" } });
    }
    logger.error('[API] ❌ Erreur serveur suppression classeur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 