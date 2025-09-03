import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

logger.dev('[Chat Messages Batch API] 🔧 Configuration:', {
  supabaseUrl: supabaseUrl ? '✅ Configuré' : '❌ Manquant',
  supabaseKey: supabaseKey ? '✅ Configuré' : '❌ Manquant'
});

if (!supabaseUrl || !supabaseKey) {
  logger.error('[Chat Messages Batch API] ❌ Variables d\'environnement Supabase manquantes');
  throw new Error('Configuration Supabase manquante');
}

// Schéma de validation pour le batch de messages
const batchMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string().nullable().optional(),
    timestamp: z.string().optional().default(() => new Date().toISOString()),
    reasoning: z.string().nullable().optional(),
    tool_calls: z.array(z.object({
      id: z.string(),
      type: z.literal('function'),
      function: z.object({
        name: z.string(),
        arguments: z.string()
      })
    })).optional(),
    tool_call_id: z.string().optional(),
    name: z.string().optional(),
    relance_index: z.number().optional(),
    success: z.boolean().optional(),
    error: z.string().nullable().optional(),
    duration_ms: z.number().optional()
  })).min(1, 'Au moins un message requis'),
  operation_id: z.string().min(1, 'ID d\'opération requis'),
  relance_index: z.number().min(0, 'Index de relance requis')
});

// Validation renforcée des messages tool
function validateToolMessages(messages: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'tool') {
      if (!msg.tool_call_id) {
        errors.push(`Message ${i}: tool_call_id manquant pour les messages tool`);
      }
      if (!msg.name && !msg.tool_name) {
        errors.push(`Message ${i}: name manquant pour les messages tool`);
      }
      if (!msg.content) {
        errors.push(`Message ${i}: content manquant pour les messages tool`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// POST /api/ui/chat-sessions/[id]/messages/batch - Ajouter un batch de messages
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    logger.dev('[Chat Messages Batch API] 📝 Ajout de batch de messages à la session:', id);
    
    // Récupérer l'utilisateur depuis l'en-tête d'autorisation
    const authHeader = request.headers.get('authorization');
    let userId: string;
    let userToken: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.substring(7);
      
      // Créer un client utilisateur pour valider le token
      if (!supabaseUrl) {
        logger.error('[Chat Messages Batch API] ❌ URL Supabase manquante');
        return NextResponse.json(
          { error: 'Configuration serveur invalide' },
          { status: 500 }
        );
      }
      
      // Créer un client avec le contexte d'authentification de l'utilisateur
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) {
        logger.error('[Chat Messages Batch API] ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
        return NextResponse.json(
          { error: 'Configuration serveur invalide' },
          { status: 500 }
        );
      }
      
      const userClient = createClient(supabaseUrl, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        }
      });
      
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      
      if (authError || !user) {
        logger.error('[Chat Messages Batch API] ❌ Erreur auth:', {
          error: authError,
          hasUser: !!user,
          errorCode: authError?.code,
          errorMessage: authError?.message
        });
        return NextResponse.json(
          { error: 'Token invalide ou expiré' },
          { status: 401 }
        );
      }
      
      userId = user.id;
      logger.dev('[Chat Messages Batch API] ✅ Utilisateur authentifié:', {
        userId: user.id,
        email: user.email,
        hasUser: !!user
      });
    } else {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const sessionId = id;
    const body = await request.json();
    
    // 🔧 NOUVEAU: Log détaillé pour debug
    logger.dev('[Chat Messages Batch API] 📋 Body reçu:', JSON.stringify(body, null, 2));
    
    // Validation du schéma
    const validationResult = batchMessageSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('[Chat Messages Batch API] ❌ Validation échouée:', {
        errors: validationResult.error.errors,
        body: JSON.stringify(body, null, 2)
      });
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { messages, operation_id, relance_index } = validationResult.data;
    
    // Validation renforcée des messages tool
    const toolValidation = validateToolMessages(messages);
    if (!toolValidation.isValid) {
      logger.error('[Chat Messages Batch API] ❌ Validation messages tool échouée:', toolValidation.errors);
      return NextResponse.json(
        { 
          error: 'Messages tool invalides', 
          details: toolValidation.errors 
        },
        { status: 422 }
      );
    }

          logger.dev('[Chat Messages Batch API] ✅ Validation réussie:', {
        sessionId,
        messageCount: messages.length,
        operation_id,
        relance_index,
        roles: messages.map(m => m.role)
      });

    // Créer un client utilisateur pour les opérations sur la session
    if (!supabaseUrl) {
      logger.error('[Chat Messages Batch API] ❌ URL Supabase manquante');
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }
    
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      logger.error('[Chat Messages Batch API] ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY manquante');
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }
    
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // 🔧 TRANSACTION ATOMIQUE: Récupérer la session avec verrou
    logger.dev('[Chat Messages Batch API] 🔍 Recherche session avec userClient:', {
      sessionId,
      userId,
      hasUserClient: !!userClient
    });
    
    const { data: currentSession, error: fetchError } = await userClient
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      logger.error('[Chat Messages Batch API] ❌ Erreur récupération session:', {
        error: fetchError,
        sessionId,
        userId,
        errorCode: fetchError.code,
        errorMessage: fetchError.message,
        errorDetails: fetchError.details
      });
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la session' },
        { status: 500 }
      );
    }

    if (!currentSession) {
      logger.error('[Chat Messages Batch API] ❌ Session non trouvée:', sessionId);
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // 🔧 IDEMPOTENCE: Vérifier si cette opération a déjà été appliquée
    const idempotencyKey = request.headers.get('Idempotency-Key');
    const operationId = request.headers.get('X-Operation-ID');
    
    if (idempotencyKey && operationId) {
      // Vérifier si l'opération existe déjà dans la session
      if (currentSession.thread && Array.isArray(currentSession.thread)) {
        const existingOperation = currentSession.thread.find(msg => 
          (msg as any).operation_id === operationId && (msg as any).relance_index === relance_index
        );
        
        if (existingOperation) {
          logger.warn('[Chat Messages Batch API] ⚠️ Opération déjà appliquée:', { operationId, relance_index });
          return NextResponse.json({
            success: true,
            applied: false,
            data: {
              session: currentSession,
              messages: [],
              duplicatesFiltered: messages.length,
              operation_id: operationId,
              relance_index
            }
          });
        }
      }
    }

    // 🔧 DÉDUPLICATION: Vérifier les tool_call_id existants
    const existingToolCallIds = new Set<string>();
    if (currentSession.thread && Array.isArray(currentSession.thread)) {
      for (const msg of currentSession.thread) {
        if (msg.role === 'tool' && (msg as any).tool_call_id) {
          existingToolCallIds.add((msg as any).tool_call_id);
        }
      }
    }

    // Filtrer les messages tool dupliqués
    const deduplicatedMessages = messages.filter(msg => {
      if (msg.role === 'tool' && msg.tool_call_id) {
        const toolCallId = msg.tool_call_id;
        if (existingToolCallIds.has(toolCallId)) {
          logger.warn('[Chat Messages Batch API] ⚠️ Message tool dupliqué ignoré:', toolCallId);
          return false;
        }
        existingToolCallIds.add(toolCallId);
      }
      return true;
    });

    // ✅ Déduplication supplémentaire: assistant avec exactement le même set de tool_calls que déjà présent
    const assistantToolCallSignatures = new Set<string>();
    if (currentSession.thread && Array.isArray(currentSession.thread)) {
      for (const msg of currentSession.thread) {
        if (msg.role === 'assistant' && Array.isArray((msg as any).tool_calls) && (msg as any).tool_calls.length > 0) {
          const calls = (msg as any).tool_calls as Array<{ id: string; function: { name: string } }>;
          const sig = calls
            .map(c => `${c.id}:${c.function?.name || 'unknown'}`)
            .sort()
            .join('|');
          if (sig) assistantToolCallSignatures.add(sig);
        }
      }
    }

    const fullyDedupedMessages = deduplicatedMessages.filter(msg => {
      if (msg.role === 'assistant' && Array.isArray((msg as any).tool_calls) && (msg as any).tool_calls.length > 0) {
        const calls = (msg as any).tool_calls as Array<{ id: string; function: { name: string } }>;
        const sig = calls
          .map(c => `${c.id}:${c.function?.name || 'unknown'}`)
          .sort()
          .join('|');
        if (assistantToolCallSignatures.has(sig)) {
          logger.warn('[Chat Messages Batch API] ⚠️ Assistant tool_calls dupliqués ignorés (même set)');
          return false;
        }
        assistantToolCallSignatures.add(sig);
      }
      return true;
    });

    if (fullyDedupedMessages.length === 0) {
      logger.warn('[Chat Messages Batch API] ⚠️ Tous les messages étaient des doublons (après assistant/tool dedup)');
      return NextResponse.json({
        success: true,
        data: {
          session: currentSession,
          messages: [],
          duplicatesFiltered: messages.length
        }
      });
    }

    // Préparer les nouveaux messages avec IDs uniques et métadonnées d'opération
    const newMessages = fullyDedupedMessages.map(msg => ({
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: msg.timestamp || new Date().toISOString(),
      operation_id: operationId,
      relance_index: relance_index
    }));

    // Ajouter les nouveaux messages au thread existant
    const currentThread = currentSession.thread || [];
    const updatedThread = [...currentThread, ...newMessages];

    // ✅ NOUVEAU: Garder TOUS les messages pour l'utilisateur
    // La limitation history_limit est uniquement pour l'API LLM, pas pour la persistance
    const historyLimit = currentSession.history_limit || 30;
    const sortedFullThread = updatedThread
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    // ✅ Pas de .slice(-historyLimit) - on garde TOUT !

    logger.dev('[Chat Messages Batch API] 💾 Mise à jour du thread...', {
      ancienThread: currentThread.length,
      nouveauxMessages: newMessages.length,
      threadComplet: sortedFullThread.length,
      limite: historyLimit,
      doublonsFiltrés: messages.length - fullyDedupedMessages.length,
      operation_id,
      relance_index,
      note: '✅ TOUS les messages conservés (pas de limitation)'
    });

    // 🔧 MISE À JOUR ATOMIQUE: Update du thread COMPLET et updated_at
    const { data: updatedSession, error: updateError } = await userClient
      .from('chat_sessions')
      .update({ 
        thread: sortedFullThread,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      logger.error('[Chat Messages Batch API] ❌ Erreur mise à jour session:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la session' },
        { status: 500 }
      );
    }

    logger.dev('[Chat Messages Batch API] ✅ Batch de messages ajouté avec succès:', {
      sessionId,
      messagesAjoutés: newMessages.length,
      totalThread: sortedFullThread.length,
      operation_id,
      relance_index
    });

    return NextResponse.json({
      success: true,
      data: {
        session: updatedSession,
        messages: newMessages,
        duplicatesFiltered: messages.length - fullyDedupedMessages.length,
        operation_id,
        relance_index
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('[Chat Messages Batch API] ❌ Erreur validation:', error.errors);
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('[Chat Messages Batch API] ❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
} 