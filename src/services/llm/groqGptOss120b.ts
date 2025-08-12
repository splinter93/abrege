import { NextResponse } from 'next/server';
import { GroqProvider } from './providers';
import type { AppContext, ChatMessage } from './types';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { buildObservation } from '@/services/toolFlowUtils';
import { simpleLogger as logger } from '@/utils/logger';
import { buildOneShotSystemInstruction } from './templates';

function detectErrorCodeFromText(text: string): string {
  const t = (text || '').toLowerCase();
  if (t.includes('row-level security') || t.includes('rls')) return 'RLS_DENIED';
  if (t.includes('timeout')) return 'TIMEOUT';
  if (t.includes('zod') || t.includes('validation')) return 'VALIDATION_ERROR';
  if (t.includes('permission') || t.includes('forbidden')) return 'FORBIDDEN';
  if (t.includes('not found') || t.includes('pgrst116')) return 'NOT_FOUND';
  if (t.includes('rate limit')) return 'RATE_LIMIT';
  if (t.includes('network') || t.includes('fetch') || t.includes('failed to')) return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

function buildConcreteFallback(toolName?: string, rawErrorJson?: string): string {
  let code = 'UNKNOWN';
  let message = 'Une erreur est survenue.';
  try {
    const parsed = rawErrorJson ? JSON.parse(rawErrorJson) : {};
    if (parsed?.code) code = String(parsed.code);
    if (parsed?.message) message = String(parsed.message);
    else if (parsed?.error) message = String(parsed.error);
  } catch {}
  const tn = toolName || 'outil';
  return `L'appel à ${tn} a échoué (${code}): ${message}\n\nAction proposée: réessayer avec des paramètres explicites et valides (ex: préciser un notebook_id autorisé, corriger les champs requis) ou choisir une autre cible autorisée.\n\nSouhaitez-vous que je relance avec des paramètres corrigés ou préférez-vous sélectionner une autre cible ?`;
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

  const groqProvider = new GroqProvider();
  const config = {
    model: agentConfig?.model || groqProvider.config.model,
    temperature: agentConfig?.temperature || groqProvider.config.temperature,
    max_tokens: agentConfig?.max_tokens || groqProvider.config.maxTokens,
    top_p: agentConfig?.top_p || groqProvider.config.topP,
    system_instructions: agentConfig?.system_instructions || 'assistant-scrivia'
  };

  // 🎯 Utiliser le système de templates des agents
  let systemContent = '';
  
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
  
  // Log du résumé des templates utilisés
  logger.dev(`[Groq OSS] 🎯 Templates de l'agent:`, agentTemplateService.generateTemplateSummary(agentConfig || {}));
  
  // 🎯 Tous les agents ont accès à l'ensemble des tools (API v2 complète)
  const tools = agentApiV2Tools.getToolsForFunctionCalling();
  logger.dev(`[Groq OSS] 🔧 Function calling activé - ${tools.length} tools disponibles (API v2 complète)`);
  
  // 🔧 Sanitize l'historique: supprimer les messages tool invalides (sans name ou tool_call_id)
  const sanitizedHistory = sessionHistory.filter((msg: ChatMessage) => {
    if (msg.role === 'tool') {
      const hasName = !!((msg as any).name || (msg as any).tool_name);
      const hasId = !!(msg as any).tool_call_id;
      if (!hasName || !hasId) {
        try {
          logger.warn(`[Groq OSS] ⚠️ Tool message invalide dans l'historique – supprimé (name: ${hasName ? 'OK' : 'MANQUANT'}, tool_call_id: ${hasId ? 'OK' : 'MANQUANT'})`);
        } catch {}
        return false;
      }
    }
    return true;
  });
  
  const messages = [
    { role: 'system' as const, content: systemContent },
    ...sanitizedHistory.map((msg: ChatMessage) => {
      const mappedMsg: any = { 
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content ?? ''
      };
      if (msg.role === 'assistant' && (msg as any).tool_calls) mappedMsg.tool_calls = (msg as any).tool_calls;
      if ((msg as any).role === 'tool') {
        if ((msg as any).tool_call_id) mappedMsg.tool_call_id = (msg as any).tool_call_id;
        mappedMsg.name = (msg as any).name || (msg as any).tool_name || 'unknown_tool';
      }
      return mappedMsg;
    }),
    { role: 'user' as const, content: message }
  ];

  await agentApiV2Tools.waitForInitialization();
  
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = process.env.GROQ_API_KEY as string;

  // ✅ NOUVEAU : Configuration sans streaming
  const apiConfig = agentConfig?.api_config || {};
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages,
    stream: false, // ✅ DÉSACTIVÉ : Plus de streaming
    temperature: config.temperature,
    max_completion_tokens: config.max_tokens,
    top_p: config.top_p,
    reasoning_effort: apiConfig.reasoning_effort ?? groqProvider.config.reasoningEffort,
    ...(tools && { tools, tool_choice: apiConfig.tool_choice ?? 'auto' as const })
  };

  // 🎯 LOGGING COMPLET DU PAYLOAD ENVOYÉ AU LLM
  logger.info(`[Groq OSS] 🚀 PAYLOAD COMPLET ENVOYÉ À L'API GROQ (NON-STREAMING):`);
  logger.info(`[Groq OSS] 📍 URL: ${apiUrl}`);
  logger.info(`[Groq OSS] 🔑 API Key: ${apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : '❌ MANQUANTE'}`);
  
  // Log détaillé du payload
  const payloadForLog = {
    ...payload,
    messages: payload.messages.map((msg, index) => ({
      ...msg,
      content: msg.content ? `${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}` : '❌ CONTENU VIDE'
    }))
  };
  
  logger.info(`[Groq OSS] 📦 PAYLOAD STRUCTURÉ:`, JSON.stringify(payloadForLog, null, 2));
  
  // Log des messages individuellement
  logger.info(`[Groq OSS] 💬 MESSAGES ENVOYÉS AU LLM:`);
  payload.messages.forEach((msg, index) => {
    const role = msg.role;
    const content = msg.content || '❌ CONTENU VIDE';
    const contentPreview = content.length > 100 ? `${content.substring(0, 100)}...` : content;
    
    logger.info(`[Groq OSS] 📝 Message ${index + 1} (${role}):`);
    logger.info(`[Groq OSS]    Contenu: ${contentPreview}`);
    logger.info(`[Groq OSS]    Longueur: ${content.length} caractères`);
    
    if (role === 'system') {
      logger.info(`[Groq OSS]    🎯 INSTRUCTIONS SYSTÈME COMPLÈTES:`);
      logger.info(`[Groq OSS]    ${content}`);
    }
  });
  
  // Log des paramètres de configuration
  logger.info(`[Groq OSS] ⚙️ PARAMÈTRES DE CONFIGURATION:`);
  logger.info(`[Groq OSS]    Modèle: ${payload.model}`);
  logger.info(`[Groq OSS]    Temperature: ${payload.temperature}`);
  logger.info(`[Groq OSS]    Max Tokens: ${payload.max_completion_tokens}`);
  logger.info(`[Groq OSS]    Top P: ${payload.top_p}`);
  logger.info(`[Groq OSS]    Streaming: ${payload.stream} (DÉSACTIVÉ)`);
  logger.info(`[Groq OSS]    Reasoning Effort: ${payload.reasoning_effort}`);
  
  if (tools) {
    logger.info(`[Groq OSS] 🔧 OUTILS DISPONIBLES (${tools.length}):`);
    tools.forEach((tool, index) => {
      logger.info(`[Groq OSS]    ${index + 1}. ${tool.function?.name || 'Nom manquant'}`);
    });
  } else {
    logger.info(`[Groq OSS] ⚠️ Aucun outil disponible`);
  }
  
  // Log du contexte de l'agent
  if (agentConfig) {
    logger.info(`[Groq OSS] 🤖 CONTEXTE DE L'AGENT:`);
    logger.info(`[Groq OSS]    Nom: ${agentConfig.name || '❌ Nom manquant'}`);
    logger.info(`[Groq OSS]    Provider: ${agentConfig.provider || '❌ Provider manquant'}`);
    logger.info(`[Groq OSS]    Modèle: ${agentConfig.model || '❌ Modèle manquant'}`);
    logger.info(`[Groq OSS]    Instructions système: ${agentConfig.system_instructions ? '✅ Présentes' : '❌ Manquantes'}`);
    logger.info(`[Groq OSS]    Template contexte: ${agentConfig.context_template ? '✅ Présent' : '❌ Manquant'}`);
    logger.info(`[Groq OSS]    Capacités API v2: ${agentConfig.api_v2_capabilities?.length || 0}`);
  }
  
  // Log du contexte de l'application
  logger.info(`[Groq OSS] 🌍 CONTEXTE DE L'APPLICATION:`);
  logger.info(`[Groq OSS]    Type: ${appContext.type || '❌ Type manquant'}`);
  logger.info(`[Groq OSS]    Nom: ${appContext.name || '❌ Nom manquant'}`);
  logger.info(`[Groq OSS]    ID: ${appContext.id || '❌ ID manquant'}`);
  logger.info(`[Groq OSS]    Contenu: ${appContext.content ? `${appContext.content.substring(0, 100)}...` : '❌ Contenu manquant'}`);
  
  // Log de l'historique des sessions
  logger.info(`[Groq OSS] 📚 HISTORIQUE DES SESSIONS (${sessionHistory.length} messages):`);
  sessionHistory.forEach((msg, index) => {
    const role = msg.role;
    const content = msg.content || '❌ Contenu vide';
    const contentPreview = content.length > 50 ? `${content.substring(0, 50)}...` : content;
    logger.info(`[Groq OSS]    ${index + 1}. [${role}] ${contentPreview}`);
  });
  
  logger.info(`[Groq OSS] 🚀 ENVOI DU PAYLOAD À L'API GROQ (NON-STREAMING)...`);

  // ✅ NOUVEAU : Appel simple à l'API Groq sans streaming
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[Groq OSS] ❌ Erreur API:`, errorText);
    logger.error(`[Groq OSS] 📊 Détails de l'erreur:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: errorText
    });
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  // ✅ NOUVEAU : Lecture de la réponse complète
  const responseData = await response.json();
  logger.info(`[Groq OSS] ✅ RÉPONSE API RÉUSSIE (NON-STREAMING):`);
  logger.info(`[Groq OSS]    Status: ${response.status} ${response.statusText}`);
  
  const choice = responseData.choices?.[0];
  if (!choice) {
    throw new Error('Réponse API invalide: pas de choix');
  }

  const content = choice.message?.content || '';
  const reasoning = choice.reasoning || '';
  const toolCalls = choice.message?.tool_calls || [];

  logger.info(`[Groq OSS] 📝 CONTENU REÇU: ${content.length} caractères`);
  if (reasoning) {
    logger.info(`[Groq OSS] 🧠 REASONING REÇU: ${reasoning.length} caractères`);
  }
  if (toolCalls.length > 0) {
    logger.info(`[Groq OSS] 🔧 TOOL CALLS REÇUS: ${toolCalls.length} appels`);
  }

  // ✅ NOUVEAU : Gestion des tool calls si présents
  if (toolCalls.length > 0) {
    logger.info(`[Groq OSS] 🔧 EXÉCUTION DES TOOL CALLS...`);
    
    const toolResults: Array<{
      tool_call_id: string;
      name: string;
      result: any;
      success: boolean;
    }> = [];
    
    for (const toolCall of toolCalls) {
      const { id, function: func } = toolCall;
      if (!func?.name) continue;
      
      try {
        const args = (() => { 
          try { 
            return JSON.parse(func.arguments || '{}'); 
          } catch { 
            return {}; 
          } 
        })();
        
        logger.info(`[Groq OSS] 🔧 Exécution de ${func.name}...`);
        
        const toolCallPromise = agentApiV2Tools.executeTool(func.name, args, userToken);
        const timeoutPromise = new Promise((resolve) => { 
          setTimeout(() => resolve({ success: false, error: 'Timeout tool call (15s)' }), 15000); 
        });
        
        const rawResult = await Promise.race([toolCallPromise, timeoutPromise]);
        
        const normalized = (() => {
          try {
            if (typeof rawResult === 'string') return { success: false, message: rawResult };
            if (rawResult && typeof rawResult === 'object') {
              const obj: any = rawResult;
              if (!('success' in obj) && ('error' in obj)) return { success: false, ...obj };
              return obj;
            }
            return { success: false, value: rawResult };
          } catch { 
            return { success: false, error: 'tool_result_normalization_error' }; 
          }
        })() as any;
        
        normalized.tool_name = func.name; 
        normalized.tool_args = args; 
        normalized.timestamp = new Date().toISOString();
        
        if (!('code' in normalized) && (normalized.error || normalized.success === false)) {
          normalized.code = detectErrorCodeFromText(String(normalized.error || normalized.message || ''));
        }
        
        toolResults.push({
          tool_call_id: id,
          name: func.name,
          result: normalized,
          success: normalized.success !== false && !normalized.error
        });
        
        logger.info(`[Groq OSS] ✅ Tool ${func.name} exécuté avec succès`);
        
      } catch (err) {
        const normalized = { 
          success: false, 
          code: detectErrorCodeFromText(err instanceof Error ? err.message : String(err)), 
          message: `❌ ÉCHEC : ${err instanceof Error ? err.message : String(err)}`, 
          details: { raw: err instanceof Error ? err.stack || err.message : String(err) }, 
          tool_name: func.name, 
          tool_args: func.arguments, 
          timestamp: new Date().toISOString() 
        } as const;
        
        toolResults.push({
          tool_call_id: id,
          name: func.name,
          result: normalized,
          success: false
        });
        
        logger.error(`[Groq OSS] ❌ Échec de l'exécution du tool ${func.name}:`, err);
      }
    }
    
    // ✅ NOUVEAU : Retourner la réponse avec les résultats des tools
    logger.info(`[Groq OSS] ✅ EXÉCUTION TERMINÉE AVEC TOOLS`);
    
    return NextResponse.json({
      success: true,
      content,
      reasoning,
      tool_calls: toolCalls,
      tool_results: toolResults,
      sessionId
    });
  }

  // ✅ NOUVEAU : Retourner la réponse simple sans tools
  logger.info(`[Groq OSS] ✅ EXÉCUTION TERMINÉE SANS TOOLS`);
  
  return NextResponse.json({
    success: true,
    content,
    reasoning,
    tool_calls: [],
    sessionId
  });
}