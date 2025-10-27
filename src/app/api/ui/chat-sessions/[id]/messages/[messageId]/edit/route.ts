/**
 * API Route pour éditer un message utilisateur dans une session de chat
 * PUT /api/ui/chat-sessions/[id]/messages/[messageId]/edit
 * 
 * ✏️ Flow ChatGPT-style :
 * 1. Remplace le contenu du message utilisateur
 * 2. Supprime tous les messages suivants dans le thread
 * 3. Retourne le nombre de messages supprimés
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { z } from 'zod';

// ✅ Créer un client Supabase admin avec service role key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey!
);

/**
 * Schéma de validation pour la requête d'édition
 */
const editMessageSchema = z.object({
  content: z.string().min(1, 'Le contenu ne peut pas être vide'),
  attachedImages: z.array(z.object({
    url: z.string(),
    fileName: z.string().optional()
  })).optional()
});

/**
 * PUT /api/ui/chat-sessions/[id]/messages/[messageId]/edit
 * Édite un message utilisateur et supprime les messages suivants
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: sessionId, messageId } = await context.params;

    logger.debug('[Edit Message API] 📝 Édition message:', {
      sessionId,
      messageId
    });

    // Valider le body de la requête
    const body = await request.json();
    const validation = editMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation échouée',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { content, attachedImages } = validation.data;

    // Récupérer le token d'auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 401 }
      );
    }

    const userToken = authHeader.replace('Bearer ', '');

    // Authentifier l'utilisateur
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer la session et vérifier la propriété
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, user_id, thread')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('[Edit Message API] ❌ Session non trouvée:', sessionError);
      return NextResponse.json(
        { error: 'Session non trouvée ou non autorisée' },
        { status: 404 }
      );
    }

    // Valider le thread
    if (!Array.isArray(session.thread)) {
      logger.error('[Edit Message API] ❌ Thread invalide');
      return NextResponse.json(
        { error: 'Thread invalide' },
        { status: 500 }
      );
    }

    // Typage du thread
    type ThreadMessage = {
      id?: string;
      role: string;
      content?: string;
      timestamp?: string;
      [key: string]: unknown;
    };

    const thread = session.thread as ThreadMessage[];

    // Trouver le message dans le thread
    let messageIndex = -1;

    // Chercher par timestamp si l'ID est au format msg-{timestamp}-{random}
    const timestampMatch = messageId.match(/^msg-(\d+)-/);
    
    if (timestampMatch) {
      const targetTimestamp = parseInt(timestampMatch[1]);
      
      messageIndex = thread.findIndex(msg => {
        if (msg.timestamp) {
          const msgTimestamp = new Date(msg.timestamp).getTime();
          const diff = Math.abs(msgTimestamp - targetTimestamp);
          // Tolérance de ±1 seconde
          return diff < 1000 && msg.role === 'user';
        }
        return false;
      });
    }

    // Fallback: chercher par ID exact
    if (messageIndex === -1) {
      messageIndex = thread.findIndex(msg => msg.id === messageId);
    }

    if (messageIndex === -1) {
      logger.error('[Edit Message API] ❌ Message non trouvé:', {
        messageId,
        sessionId,
        threadLength: thread.length
      });
      return NextResponse.json(
        { error: 'Message non trouvé' },
        { status: 404 }
      );
    }

    const messageToEdit = thread[messageIndex];

    // Vérifier que c'est bien un message user
    if (messageToEdit.role !== 'user') {
      return NextResponse.json(
        { error: 'Seuls les messages utilisateur peuvent être édités' },
        { status: 400 }
      );
    }

    // Créer le nouveau thread : remplacer le message et supprimer les suivants
    const newThread = thread.slice(0, messageIndex + 1);
    newThread[messageIndex] = {
      ...messageToEdit,
      content,
      updated_at: new Date().toISOString()
    };

    const deletedCount = thread.length - newThread.length;

    // Mettre à jour la session avec le nouveau thread
    const { error: updateError } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        thread: newThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      logger.error('[Edit Message API] ❌ Erreur mise à jour session:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    logger.info('[Edit Message API] ✅ Message édité avec succès:', {
      messageId,
      messageIndex,
      sessionId,
      messagesDeleted: deletedCount
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        messageIndex,
        content,
        messagesDeleted: deletedCount
      }
    });

  } catch (error) {
    logger.error('[Edit Message API] ❌ Erreur générale:', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur', 
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    );
  }
}
