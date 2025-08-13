import { NextResponse } from 'next/server';
import { GroqProvider } from './providers';
import type { AppContext } from './types';
import { ChatMessage } from '@/types/chat';
import { ToolCallManager } from './toolCallManager';
import { ChatHistoryCleaner } from '@/services/chatHistoryCleaner';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { simpleLogger as logger } from '@/utils/logger';

// 🎯 Configuration de sécurité et limites
const MAX_TOOL_CALLS = 10;
const MAX_RELANCES = 2;

// 🎯 Fonctions utilitaires
function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function detectErrorCodeFromText(text: string): string {
  if (text.includes('401') || text.includes('Unauthorized')) return 'AUTH_ERROR';
  if (text.includes('403') || text.includes('Forbidden')) return 'PERMISSION_ERROR';
  if (text.includes('404') || text.includes('Not found')) return 'NOT_FOUND';
  if (text.includes('500') || text.includes('Internal')) return 'SERVER_ERROR';
  if (text.includes('timeout') || text.includes('Timeout')) return 'TIMEOUT';
  return 'UNKNOWN_ERROR';
}

export async function handleGroqGptOss120b(params: {
  message: string;
  appContext: AppContext;
  sessionHistory: ChatMessage[];
  agentConfig?: any;
  userToken: string;
  sessionId: string;
}) {
  const { message, appContext, sessionHistory, agentConfig, userToken, sessionId } = params;

  try {
    // 🎯 Initialiser les services de base
    const historyCleaner = ChatHistoryCleaner.getInstance();
    const groqProvider = new GroqProvider();

    // 🎯 Nettoyer l'historique
    const cleanedHistory = historyCleaner.cleanHistory(sessionHistory, {
      maxMessages: 40, // Augmenter pour plus de contexte
      removeInvalidToolMessages: false, // Ne pas supprimer les messages tool invalides
      removeDuplicateMessages: true, // Garder la suppression des doublons
      removeEmptyMessages: true, // Garder la suppression des messages vides
      preserveSystemMessages: true // Garder la préservation des messages système
    });

    // 🎯 Préparer le contenu système
    let systemContent = '';
    try {
      const { agentTemplateService } = await import('./agentTemplateService');
      const renderedTemplate = agentTemplateService.renderAgentTemplate(
        agentConfig || {},
        { 
          type: appContext.type, 
          name: appContext.name, 
          id: appContext.id, 
          content: appContext.content 
        },
        'Tu es un assistant IA utile et bienveillant.'
      );
      systemContent = renderedTemplate.content;
    } catch (error) {
      logger.warn(`[Groq OSS] ⚠️ Impossible de charger le template, utilisation du fallback`);
      systemContent = `Tu es un assistant IA utile et bienveillant. 

IMPORTANT - Gestion des erreurs de tools :
- Si des tools échouent, analyse l'erreur et explique ce qui s'est mal passé
- Si tu comprends l'erreur et peux la corriger, propose une solution alternative ou retente
- Si tu ne peux pas corriger l'erreur, donne une explication claire et des suggestions
- Ne laisse jamais l'utilisateur sans réponse, même en cas d'échec de tools

Sois toujours utile et constructif, même face aux erreurs.`;
    }

    // 🎯 Préparer les messages pour le premier appel
    const messages: any[] = [
      { role: 'system' as const, content: systemContent },
      ...cleanedHistory.slice(-20),
      { role: 'user' as const, content: message }
    ];

    // 🎯 Premier appel au modèle
    logger.info(`[Groq OSS] 🚀 Premier appel au modèle...`);
    
    const firstResponse = await groqProvider.call(message, appContext, messages, 
      agentApiV2Tools.getToolsForFunctionCalling(agentConfig)
    );

    // 🎯 Extraire la réponse et les tool calls
    const contentForUi = (firstResponse as any).content || '';
    const reasoning = (firstResponse as any).reasoning || '';
    const toolCalls = (firstResponse as any).tool_calls || [];

    // 🎯 Si pas de tool calls, retourner directement
    if (!toolCalls || toolCalls.length === 0) {
      logger.info(`[Groq OSS] ✅ Réponse directe sans tools`);
      return NextResponse.json({
        success: true,
        content: contentForUi,
        reasoning,
        tool_calls: [],
        sessionId
      });
    }

    // 🎯 VALIDATION DES TOOL CALLS
    const validationResult = validateToolCalls(toolCalls);
    if (!validationResult.isValid) {
      logger.error(`[Groq OSS] ❌ Tool calls invalides:`, validationResult.errors);
      return NextResponse.json({
        success: false,
        error: 'Tool calls invalides',
        details: validationResult.errors,
        sessionId
      }, { status: 422 });
    }

    // 🎯 LIMITE DE SÉCURITÉ
    if (toolCalls.length > MAX_TOOL_CALLS) {
      logger.warn(`[Groq OSS] ⚠️ Limite de tool calls dépassée: ${toolCalls.length}/${MAX_TOOL_CALLS}`);
      toolCalls.splice(MAX_TOOL_CALLS);
    }

    // 🎯 EXÉCUTION DES TOOLS
    logger.info(`[Groq OSS] 🔧 EXÉCUTION DE ${toolCalls.length} TOOLS...`);

    const toolCallManager = ToolCallManager.getInstance();
    const toolResults: any[] = [];
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 🔧 Exécution séquentielle des tools
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];

      try {
        logger.info(`[Groq OSS] 🔧 Exécution du tool ${i + 1}/${toolCalls.length}: ${toolCall.function?.name}`);
        
        const result = await toolCallManager.executeToolCall(toolCall, userToken, 3, { batchId });

        toolResults.push({
          tool_call_id: result.tool_call_id,
          name: result.name,
          result: result.result,
          success: result.success,
          timestamp: new Date().toISOString()
        });

        logger.info(`[Groq OSS] ✅ Tool ${result.name} exécuté avec succès`);
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error(`[Groq OSS] ❌ Erreur lors de l'exécution du tool ${toolCall.function?.name}:`, err);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          name: toolCall.function?.name || 'unknown',
          result: { 
            success: false, 
            error: errorMsg,
            code: detectErrorCodeFromText(errorMsg)
          },
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 🎯 RELANCE AVEC RÉSULTATS DES TOOLS
    logger.info(`[Groq OSS] 🔄 RELANCE AVEC RÉSULTATS DES TOOLS...`);

    // 🔧 CONSTRUCTION INTELLIGENTE DE L'HISTORIQUE
    // Garder plus de contexte et préserver la logique de conversation
    const contextMessages = cleanedHistory.slice(-25); // Augmenter le contexte
    
    // Construire l'historique de manière plus logique
    const secondCallMessages: any[] = [
      // 1. Message système
      { role: 'system' as const, content: systemContent, timestamp: new Date().toISOString() },
      
      // 2. Contexte de conversation (plus de messages pour maintenir le fil)
      ...contextMessages,
      
      // 3. Message utilisateur actuel
      { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
      
      // 4. Message assistant avec tool calls (réponse du premier appel)
      {
        role: 'assistant' as const,
        content: contentForUi || null, // null si pas de contenu
        tool_calls: toolCalls,
        timestamp: new Date().toISOString()
      }
    ];

    // 🔧 Ajouter les résultats des tools dans le bon format
    const toolMessages = toolResults
      .filter((result: any) => {
        // Filtrer les résultats sans tool_call_id valide
        if (!result.tool_call_id || typeof result.tool_call_id !== 'string') {
          logger.warn(`[Groq OSS] ⚠️ Tool result ignoré - tool_call_id invalide:`, result);
          return false;
        }
        if (!result.name || typeof result.name !== 'string') {
          logger.warn(`[Groq OSS] ⚠️ Tool result ignoré - nom invalide:`, result);
          return false;
        }
        return true;
      })
      .map((result: any) => ({
        role: 'tool' as const,
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: JSON.stringify(result.result),
        timestamp: result.timestamp
      }));

    // Log des toolMessages pour debug
    logger.dev(`[Groq OSS] 🔧 ToolMessages construits:`, toolMessages.map(msg => ({
      role: msg.role,
      tool_call_id: msg.tool_call_id,
      name: msg.name,
      contentLength: msg.content?.length || 0
    })));

    // 🔧 CONSTRUCTION SIMPLIFIÉE ET LOGIQUE
    // Ajouter directement les messages tool après le message assistant
    const finalMessages = [...secondCallMessages];
    
    // Insérer les messages tool immédiatement après le message assistant
    if (toolMessages.length > 0) {
      // Trouver l'index du message assistant avec tool_calls
      const assistantIndex = finalMessages.findIndex(msg => 
        msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0
      );
      
      if (assistantIndex !== -1) {
        // Insérer les messages tool juste après
        finalMessages.splice(assistantIndex + 1, 0, ...toolMessages);
        logger.dev(`[Groq OSS] 🔧 Messages tool insérés à l'index ${assistantIndex + 1}`);
      } else {
        // Fallback: ajouter à la fin
        finalMessages.push(...toolMessages);
        logger.warn(`[Groq OSS] ⚠️ Message assistant avec tool_calls non trouvé, messages tool ajoutés à la fin`);
      }
    }

    // Log des finalMessages pour debug
    logger.dev(`[Groq OSS] 🔧 FinalMessages construits:`, finalMessages.map((msg, index) => ({
      index,
      role: msg.role,
      tool_call_id: msg.role === 'tool' ? msg.tool_call_id : 'N/A',
      name: msg.role === 'tool' ? msg.name : 'N/A'
    })));

    // 🔧 Validation finale des messages avant envoi à l'API
    const validatedMessages = finalMessages.filter((msg, index) => {
      if (!msg || typeof msg !== 'object') {
        logger.warn(`[Groq OSS] ⚠️ Message invalide à l'index ${index}:`, msg);
        return false;
      }
      if (!msg.role || typeof msg.role !== 'string') {
        logger.warn(`[Groq OSS] ⚠️ Message sans role valide à l'index ${index}:`, msg);
        return false;
      }
      // Validation spéciale pour les messages tool
      if (msg.role === 'tool') {
        if (!msg.tool_call_id || typeof msg.tool_call_id !== 'string') {
          logger.warn(`[Groq OSS] ⚠️ Message tool sans tool_call_id valide à l'index ${index}:`, msg);
          return false;
        }
        if (!msg.name || typeof msg.name !== 'string') {
          logger.warn(`[Groq OSS] ⚠️ Message tool sans nom valide à l'index ${index}:`, msg);
          return false;
        }
        if (!msg.content || typeof msg.content !== 'string') {
          logger.warn(`[Groq OSS] ⚠️ Message tool sans contenu valide à l'index ${index}:`, msg);
          return false;
        }
      }
      return true;
    });

    logger.dev(`[Groq OSS] 🔧 Messages validés:`, {
      originalCount: finalMessages.length,
      validatedCount: validatedMessages.length,
      filteredCount: finalMessages.length - validatedMessages.length
    });

    // 🎯 Second appel au modèle
    logger.info(`[Groq OSS] 🔄 Second appel au modèle avec résultats des tools...`);
    
    const secondResponse = await groqProvider.call(message, appContext, validatedMessages, 
      agentApiV2Tools.getToolsForFunctionCalling(agentConfig)
    );

    // 🎯 Vérifier s'il y a de nouveaux tool calls
    const newToolCalls = (secondResponse as any).tool_calls || [];
    
    // 🎯 GESTION INTELLIGENTE DES ERREURS : Permettre au LLM de gérer les échecs
    const hasFailedTools = toolResults.some((result: any) => !result.success);
    const hasAuthErrors = toolResults.some((result: any) => 
      result.result?.error?.includes('Impossible d\'extraire l\'utilisateur') ||
      result.result?.error?.includes('Token invalide')
    );
    
    // 🎯 NOUVEAU : Si des tools ont échoué, laisser le LLM décider
    if (hasFailedTools && !hasAuthErrors) {
      logger.info(`[Groq OSS] ⚠️ Tools échoués détectés, laisser le LLM gérer intelligemment`);
      
      // Le LLM peut soit expliquer l'erreur, soit retenter, soit continuer
      if (newToolCalls.length > 0) {
        logger.info(`[Groq OSS] 🔄 LLM a choisi de retenter/continuer après échec`);
        return NextResponse.json({
          success: true,
          content: (secondResponse as any).content || '',
          reasoning: (secondResponse as any).reasoning || '',
          tool_calls: newToolCalls,
          tool_results: toolResults,
          sessionId,
          is_relance: true,
          has_new_tool_calls: true,
          has_failed_tools: true
        });
      } else {
        // Le LLM a choisi d'expliquer l'erreur ou de donner une solution alternative
        logger.info(`[Groq OSS] ✅ LLM a géré les échecs intelligemment`);
        return NextResponse.json({
          success: true,
          content: (secondResponse as any).content || 'Certains outils ont échoué, mais j\'ai pu traiter votre demande.',
          reasoning: (secondResponse as any).reasoning || 'Gestion intelligente des échecs de tools',
          tool_calls: [],
          tool_results: toolResults,
          sessionId,
          is_relance: true,
          has_new_tool_calls: false,
          has_failed_tools: true
        });
      }
    }
    
    // 🎯 CONTINUATION NORMALE : Nouveaux tool calls sans échecs
    if (newToolCalls.length > 0 && !hasAuthErrors) {
      logger.info(`[Groq OSS] 🔄 Nouveaux tool calls détectés, continuation du cycle`);
      
      return NextResponse.json({
        success: true,
        content: (secondResponse as any).content || '',
        reasoning: (secondResponse as any).reasoning || '',
        tool_calls: newToolCalls,
        tool_results: toolResults,
        sessionId,
        is_relance: true,
        has_new_tool_calls: true
      });
    }
    
    // 🎯 GESTION DES ERREURS D'AUTHENTIFICATION
    if (hasAuthErrors) {
      logger.warn(`[Groq OSS] ⚠️ Tools échoués à cause d'erreurs d'authentification, pas de continuation`);
      
      return NextResponse.json({
        success: true,
        content: `Je ne peux pas exécuter cette action car vous n'êtes pas correctement authentifié. Veuillez vous connecter et réessayer.`,
        reasoning: 'Tools échoués à cause d\'erreurs d\'authentification',
        tool_calls: [],
        tool_results: toolResults,
        sessionId,
        is_relance: true,
        has_new_tool_calls: false
      });
    }

    // 🎯 SUCCÈS : Réponse finale sans nouveaux tool calls
    const finalContent = (secondResponse as any).content || contentForUi;
    const finalReasoning = (secondResponse as any).reasoning || reasoning;

    logger.info(`[Groq OSS] ✅ ROUND TERMINÉ AVEC SUCCÈS`);

    return NextResponse.json({
      success: true,
      content: finalContent,
      reasoning: finalReasoning,
      tool_calls: toolCalls,
      tool_results: toolResults,
      sessionId,
      is_relance: true
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[Groq OSS] ❌ Erreur fatale:`, error);

    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur',
      details: errorMsg,
      sessionId
    }, { status: 500 });
  }
}

// 🎯 Fonction utilitaire pour valider les tool calls
function validateToolCalls(toolCalls: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const toolCall of toolCalls) {
    if (!toolCall.id || typeof toolCall.id !== 'string') {
      errors.push(`Tool call sans ID valide`);
    }
    
    if (!toolCall.function?.name || typeof toolCall.function.name !== 'string') {
      errors.push(`Tool call ${toolCall.id} sans nom de fonction valide`);
    }
    
    if (!toolCall.function?.arguments || typeof toolCall.function.arguments !== 'string') {
      errors.push(`Tool call ${toolCall.id} sans arguments valides`);
    } else {
      try {
        JSON.parse(toolCall.function.arguments);
      } catch {
        errors.push(`Tool call ${toolCall.id} avec arguments JSON invalides`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 🎯 Fonction utilitaire pour vérifier si un message a des tool calls
function isAssistantWithToolCalls(msg: any): boolean {
  return msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
}