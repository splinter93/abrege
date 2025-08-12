import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GroqProvider } from './providers';
import type { AppContext, ChatMessage } from './types';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { buildObservation } from '@/services/toolFlowUtils';
import { simpleLogger as logger } from '@/utils/logger';

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

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

import { buildOneShotSystemInstruction } from './templates';

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
  incomingChannelId?: string;
  userToken: string;
  sessionId: string;
}) {
  const { message, appContext, sessionHistory, agentConfig, incomingChannelId, userToken, sessionId } = params;

  const channelId = incomingChannelId || `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Single realtime channel
  const supabase = createSupabaseAdmin();
  const channel = supabase.channel(channelId);
  try { await channel.subscribe(); } catch {}

  const groqProvider = new GroqProvider();
  const config = {
    model: agentConfig?.model || groqProvider.config.model,
    temperature: agentConfig?.temperature || groqProvider.config.temperature,
    max_tokens: agentConfig?.max_tokens || groqProvider.config.maxTokens,
    top_p: agentConfig?.top_p || groqProvider.config.topP,
    system_instructions: agentConfig?.system_instructions || 'assistant-scrivia'
  };

  // 🎯 CORRECTION : Utiliser le système de templates des agents
  let systemContent = '';
  
  // ✅ Utiliser le service de templates d'agents
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
        // ✅ Toujours fournir un name pour les messages tool
        mappedMsg.name = (msg as any).name || (msg as any).tool_name || 'unknown_tool';
      }
      return mappedMsg;
    }),
    { role: 'user' as const, content: message }
  ];

  await agentApiV2Tools.waitForInitialization();
  
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = process.env.GROQ_API_KEY as string;

    // Make engine parameters configurable via agentConfig.api_config or provider defaults
    const apiConfig = agentConfig?.api_config || {};
    const payload = {
      model: 'openai/gpt-oss-120b',
      messages,
      stream: apiConfig.stream ?? groqProvider.config.supportsStreaming,
      temperature: config.temperature,
      max_completion_tokens: config.max_tokens,
      top_p: config.top_p,
      reasoning_effort: apiConfig.reasoning_effort ?? groqProvider.config.reasoningEffort,
      ...(tools && { tools, tool_choice: apiConfig.tool_choice ?? 'auto' as const })
    };

  // 🎯 LOGGING COMPLET DU PAYLOAD ENVOYÉ AU LLM
  logger.info(`[Groq OSS] 🚀 PAYLOAD COMPLET ENVOYÉ À L'API GROQ:`);
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
  logger.info(`[Groq OSS]    Streaming: ${payload.stream}`);
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
  
  logger.info(`[Groq OSS] 🚀 ENVOI DU PAYLOAD À L'API GROQ...`);

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

  // ✅ Log de la réponse réussie
  logger.info(`[Groq OSS] ✅ RÉPONSE API RÉUSSIE:`);
  logger.info(`[Groq OSS]    Status: ${response.status} ${response.statusText}`);
  logger.info(`[Groq OSS]    Headers:`, Object.fromEntries(response.headers.entries()));
  logger.info(`[Groq OSS]    Streaming activé: ${response.body ? '✅ Oui' : '❌ Non'}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Impossible de lire le stream de réponse');

  let accumulatedContent = '';
  let pendingDataLine = '';
  const toolCallMap: Record<string, { id: string; name: string; arguments: string }> = {};
  const toolCallOrder: string[] = [];
  let tokenBuffer = '';
  let bufferSize = 0;
  const BATCH_SIZE = 50; // ✅ CORRECTION CRITIQUE: De 20 à 50 pour éliminer les saccades
  const MAX_FLUSH_RETRIES = 5; // ✅ AUGMENTÉ: De 3 à 5 pour plus de robustesse

  // ✅ NOUVEAU: Gestion robuste du buffer de tokens
  const flushTokenBuffer = async (retryCount = 0, force = false) => {
    if (tokenBuffer.length > 0 && (force || bufferSize >= BATCH_SIZE)) {
      try {
        await channel.send({ 
          type: 'broadcast', 
          event: 'llm-token-batch', 
          payload: { tokens: tokenBuffer, sessionId } 
        });
        tokenBuffer = '';
        bufferSize = 0;
        logger.dev(`[Groq OSS] ✅ Buffer flushé avec succès (${retryCount > 0 ? `retry ${retryCount}` : 'première tentative'})`);
      } catch (err) {
        if (retryCount < MAX_FLUSH_RETRIES) {
          logger.warn(`[Groq OSS] ⚠️ Flush échoué, retry ${retryCount + 1}/${MAX_FLUSH_RETRIES}:`, err);
          // ✅ RETRY AVEC BACKOFF: Attendre avant de réessayer
          setTimeout(() => flushTokenBuffer(retryCount + 1, force), 100 * Math.pow(2, retryCount));
        } else {
          logger.error('[Groq OSS] ❌ Flush définitivement échoué après tous les retry:', err);
          // ✅ FALLBACK: Envoyer token par token en cas d'échec définitif
          logger.warn('[Groq OSS] 🔄 Fallback: envoi token par token...');
          for (const token of tokenBuffer) {
            try {
              await channel.send({ 
                type: 'broadcast', 
                event: 'llm-token', 
                payload: { token, sessionId } 
              });
            } catch (tokenError) {
              logger.error('[Groq OSS] ❌ Token individuel échoué:', tokenError);
            }
          }
          tokenBuffer = '';
          bufferSize = 0;
        }
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        logger.info('[Groq OSS] 🎉 reader.read() → done');
        break;
      }
      
      // ✅ CORRECTION: Gestion robuste des chunks
      const chunk = new TextDecoder().decode(value);
      
      // ✅ AMÉLIORATION: Gestion des chunks incomplets
      if (pendingDataLine && !chunk.includes('\n')) {
        // Si on a du pending et que le chunk n'a pas de newline, c'est probablement un JSON incomplet
        pendingDataLine += chunk;
        logger.dev(`[Groq OSS] 🔄 Chunk incomplet accumulé (${chunk.length} chars), total pending: ${pendingDataLine.length}`);
        continue;
      }
      
      const lines = chunk.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('data: ')) continue;
        
        const data = line.slice(6);
        if (data === '[DONE]') break;
        
        try {
          // ✅ CORRECTION: Gestion robuste du pendingDataLine
          const toParse = pendingDataLine + data;
          let parsed: any;
          
          try { 
            parsed = JSON.parse(toParse); 
            pendingDataLine = ''; // ✅ Reset seulement si parsing réussi
          } catch (parseError) { 
            // ✅ AMÉLIORATION: Log du problème de parsing
            if (toParse.length > 100) {
              logger.warn(`[Groq OSS] ⚠️ JSON incomplet détecté (${toParse.length} chars), accumulation...`);
            }
            pendingDataLine = toParse; 
            continue; 
          }
          
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;
          
          if (delta.reasoning && delta.channel === 'analysis') {
            await channel.send({ type: 'broadcast', event: 'llm-reasoning', payload: { reasoning: delta.reasoning, sessionId } });
            logger.info(`[Groq OSS] 🧠 Reasoning chunk: ${delta.reasoning}`);
            continue;
          }
          
          // Collect tool calls only here; broadcast once later with persistence
          if (delta.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const id = toolCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              if (!toolCallMap[id]) {
                toolCallMap[id] = { id, name: toolCall.function?.name || '', arguments: toolCall.function?.arguments || '' };
                toolCallOrder.push(id);
              } else {
                if (toolCall.function?.name) toolCallMap[id].name = toolCall.function.name;
                if (toolCall.function?.arguments) toolCallMap[id].arguments += toolCall.function.arguments;
              }
            }
          } else {
            const token =
              delta.content ??
              delta.message?.content ??
              (typeof delta.text === 'string' ? delta.text : undefined) ??
              (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
              
            if (token) {
              accumulatedContent += token;
              tokenBuffer += token;
              bufferSize++;
              
              // ✅ CORRECTION: Flush plus fréquent pour éviter la perte de tokens
              if (bufferSize >= BATCH_SIZE) {
                await flushTokenBuffer();
              }
            }
          }
        } catch (parseError) {
          // ✅ AMÉLIORATION: Log des erreurs de parsing
          logger.warn(`[Groq OSS] ⚠️ Erreur parsing ligne: ${line.substring(0, 100)}...`, parseError);
          continue;
        }
      }
    }
  } catch (err) {
    logger.error('[Groq OSS] ❌ Streaming read error:', err);
    throw err;
  }

  // ✅ CORRECTION: Force flush du buffer restant
  await flushTokenBuffer(0, true);
  
  // ✅ AMÉLIORATION: Log du contenu final complet
  logger.info(`[Groq OSS] 📝 Contenu accumulé final: ${accumulatedContent}`);
  logger.info(`[Groq OSS] 📊 Statistiques finales: ${accumulatedContent.length} caractères, ${bufferSize} tokens en buffer`);

  // ✅ NOUVEAU: Validation et correction des messages tronqués
  const validateAndFixContent = (content: string): string => {
    if (!content || content.length === 0) return content;
    
    // Détecter les messages qui se terminent brutalement
    const suspiciousEndings = [
      /[a-zA-ZÀ-ÿ]$/, // Se termine par une lettre
      /[0-9]$/,       // Se termine par un chiffre
      /[^\s\.\!\?\;\,\)\]\}]$/, // Se termine par un caractère qui n'est pas une ponctuation naturelle
    ];
    
    const isSuspiciouslyTruncated = suspiciousEndings.some(pattern => pattern.test(content));
    
    if (isSuspiciouslyTruncated) {
      logger.warn(`[Groq OSS] ⚠️ Message potentiellement tronqué détecté (${content.length} chars)`);
      logger.warn(`[Groq OSS] 📝 Derniers caractères: "${content.slice(-20)}"`);
      
      // ✅ CORRECTION: Ajouter une ponctuation si nécessaire
      if (!content.match(/[\.\!\?\;\,\)\]\}]$/)) {
        const correctedContent = content + '.';
        logger.info(`[Groq OSS] ✅ Message corrigé: ajout d'un point final`);
        return correctedContent;
      }
    }
    
    return content;
  };

  // ✅ CORRECTION: Valider et corriger le contenu avant utilisation
  accumulatedContent = validateAndFixContent(accumulatedContent);

  // Fallback non-stream si aucun contenu reçu
  if (!accumulatedContent.trim()) {
    logger.warn(`[Groq OSS] ⚠️ Aucun contenu reçu en stream, tentative fallback non-stream`);
    try {
      const fallbackPayload = { ...payload, stream: false };
      const fallbackResp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(fallbackPayload)
      });
      if (fallbackResp.ok) {
        const j = await fallbackResp.json();
        const fallbackContent = j.choices?.[0]?.message?.content ?? '';
        logger.info(`[Groq OSS] 📝 Fallback non-stream contenu: ${fallbackContent}`);
        accumulatedContent = fallbackContent;
      } else {
        const errTxt = await fallbackResp.text();
        logger.error(`[Groq OSS] ❌ Fallback non-stream erreur: ${fallbackResp.status} - ${errTxt}`);
      }
    } catch (e) {
      logger.error('[Groq OSS] ❌ Exception fallback non-stream:', e);
    }
  }

  if (toolCallOrder.length > 0) {
    const outgoingAssistantToolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
    const toolResultMessages: any[] = [];

    // Persist assistant tool_calls immediately for consistent ordering and broadcast once
    for (const id of toolCallOrder) {
      const call = toolCallMap[id];
      if (!call?.name) continue;
      const callId = call.id || id;
      outgoingAssistantToolCalls.push({ id: callId, type: 'function', function: { name: call.name, arguments: call.arguments } });
    }
    if (outgoingAssistantToolCalls.length > 0) {
      await channel.send({ type: 'broadcast', event: 'llm-tool-calls', payload: { sessionId, tool_calls: outgoingAssistantToolCalls } });
      try {
        const { ChatSessionService } = await import('@/services/chatSessionService');
        const css = ChatSessionService.getInstance();
        await css.addMessageWithToken(sessionId, { role: 'assistant', content: null, tool_calls: outgoingAssistantToolCalls, timestamp: new Date().toISOString() } as any, userToken);
      } catch (e) {
        logger.error('[Groq OSS] ❌ Persist assistant tool_calls failed:', e);
      }
    }

    for (const id of toolCallOrder) {
      const call = toolCallMap[id];
      if (!call?.name) continue;
      const callId = call.id || id;
      const args = (() => { try { return JSON.parse(call.arguments || '{}'); } catch { return {}; } })();
      try {
        const toolCallPromise = agentApiV2Tools.executeTool(call.name, args, userToken);
        const timeoutPromise = new Promise((resolve) => { setTimeout(() => resolve({ success: false, error: 'Timeout tool call (15s)' }), 15000); });
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
          } catch { return { success: false, error: 'tool_result_normalization_error' }; }
        })() as any;
        normalized.tool_name = call.name; normalized.tool_args = args; normalized.timestamp = new Date().toISOString();
        if (!('code' in normalized) && (normalized.error || normalized.success === false)) normalized.code = detectErrorCodeFromText(String(normalized.error || normalized.message || ''));
        const isError = normalized.success === false || !!(normalized as any).error;
        let contentStr = JSON.stringify(normalized);
        // ✅ CORRECTION: Augmenter la limite de 8KB à 64KB pour éviter la troncature
        const MAX = 64 * 1024; // 64KB au lieu de 8KB
        if (contentStr.length > MAX) {
          contentStr = JSON.stringify({ success: normalized.success === true, code: normalized.code, message: 'Résultat tronqué - données trop volumineuses', truncated: true, original_size: contentStr.length, tool_name: normalized.tool_name, tool_args: normalized.tool_args, timestamp: normalized.toISOString() });
        }
        toolResultMessages.push({ role: 'tool' as const, tool_call_id: callId, name: call.name, content: contentStr });
        try {
          await channel.send({ type: 'broadcast', event: 'llm-tool-result', payload: { sessionId, tool_name: call.name, tool_call_id: callId, result: (()=>{ try { return JSON.parse(contentStr); } catch { return { success: !isError, message: 'truncated' }; } })(), success: !isError } });
        } catch (e) {
          logger.error('[Groq OSS] ❌ Broadcast tool result failed:', e);
        }
        try {
          const { ChatSessionService } = await import('@/services/chatSessionService');
          const css = ChatSessionService.getInstance();
          await css.addMessageWithToken(sessionId, { role: 'tool', tool_call_id: callId, name: call.name, content: contentStr, timestamp: new Date().toISOString() } as any, userToken);
        } catch (e) { logger.error('[Groq OSS] ❌ Persist tool result failed:', e); }
      } catch (err) {
        const normalized = { success: false, code: detectErrorCodeFromText(err instanceof Error ? err.message : String(err)), message: `❌ ÉCHEC : ${err instanceof Error ? err.message : String(err)}`, details: { raw: err instanceof Error ? err.stack || err.message : String(err) }, tool_name: call.name, tool_args: args, timestamp: new Date().toISOString() } as const;
        let contentStr = JSON.stringify(normalized);
        // ✅ CORRECTION: Augmenter la limite de 8KB à 64KB pour éviter la troncature
        const MAX = 64 * 1024; // 64KB au lieu de 8KB
        if (contentStr.length > MAX) {
          contentStr = JSON.stringify({ success: false, code: normalized.code, message: 'Résultat tronqué - données trop volumineuses', truncated: true, original_size: contentStr.length, tool_name: normalized.tool_name, tool_args: normalized.tool_args, timestamp: normalized.timestamp });
        }
        toolResultMessages.push({ role: 'tool' as const, tool_call_id: callId, name: call.name, content: contentStr });
        try { await channel.send({ type: 'broadcast', event: 'llm-tool-result', payload: { sessionId, tool_name: call.name, tool_call_id: callId, result: (()=>{ try { return JSON.parse(contentStr); } catch { return { success: false, message: 'truncated' }; } })(), success: false } }); } catch (e) { logger.error('[Groq OSS] ❌ Broadcast tool error failed:', e); }
        try {
          const { ChatSessionService } = await import('@/services/chatSessionService');
          const css = ChatSessionService.getInstance();
          await css.addMessageWithToken(sessionId, { role: 'tool', tool_call_id: callId, name: call.name, content: contentStr, timestamp: new Date().toISOString() } as any, userToken);
        } catch (e) { logger.error('[Groq OSS] ❌ Persist tool error failed:', e); }
      }
    }

    // Observation if any failed
    const anyFailed = toolResultMessages.some(m => { try { const c = JSON.parse(m.content); return c?.success === false || !!c?.error || !!c?.code; } catch { return false; } });
    const cleanMessages = messages.filter(msg => msg.role !== 'system' && !((msg.role === 'user' && 'tool_calls' in (msg as any)) || (msg.role === 'assistant' && 'tool_calls' in (msg as any))));
    const toolAssistantMsg = { role: 'assistant' as const, content: null, tool_calls: outgoingAssistantToolCalls };
    const updatedMessagesBase = [...cleanMessages, toolAssistantMsg, ...toolResultMessages];
    let updatedMessages = updatedMessagesBase;
    if (anyFailed) {
      const firstFailed = toolResultMessages.find(m => { try { const c = JSON.parse(m.content); return c?.success === false || !!c?.error || !!c?.code; } catch { return false; } });
      const obs = buildObservation(firstFailed?.name || 'unknown_tool', firstFailed?.content || '{}');
      updatedMessages = [...updatedMessagesBase, { role: 'assistant' as const, name: 'observation', content: obs.text }];
    }

    // 🎯 Choisir des instructions système naturelles pour la relance
    const relaunchSystemContent = anyFailed
      ? (buildOneShotSystemInstruction() + '\n\nRéponds de manière naturelle et conversationnelle. N\'utilise pas de rubriques formelles (ex: “Erreur:”, “Action:”, “Question:”).')
      : (systemContent + '\n\nConsignes de style: réponds naturellement en français, en 1–2 phrases, sans sections formelles ni listes. Confirme simplement ce qui a été fait et propose la suite.');

    // Multi-round relaunch with tools enabled (chaining supported up to 10 rounds)
    let currentMessages = updatedMessages;
    const MAX_TOOL_ROUNDS = 10;
    for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
      // Relaunch payload with configurable parameters
      const relaunchApiConfig = agentConfig?.api_config || {};
      const relaunchPayload = {
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: relaunchSystemContent }, ...currentMessages],
        stream: relaunchApiConfig.stream ?? groqProvider.config.supportsStreaming,
        temperature: config.temperature,
        max_completion_tokens: config.max_tokens,
        top_p: config.top_p,
        reasoning_effort: relaunchApiConfig.reasoning_effort ?? groqProvider.config.reasoningEffort,
        ...(tools && { tools, tool_choice: relaunchApiConfig.tool_choice ?? 'auto' as const })
      };

      const relaunchResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify(relaunchPayload)
      });

      if (!relaunchResp.ok) {
        const errTxt = await relaunchResp.text();
        logger.error('[Groq OSS] ❌ Erreur relance:', errTxt);
        throw new Error(`Groq relaunch error: ${relaunchResp.status} - ${errTxt}`);
      }

      const relaunchReader = relaunchResp.body?.getReader();
      if (!relaunchReader) throw new Error('Impossible de lire le stream de relance Groq');

      let finalAccum = '';
      let finalBuf = '';
      let finalSize = 0;
      const flushFinal = async () => {
        if (finalBuf.length > 0) {
          await channel.send({ type: 'broadcast', event: 'llm-token-batch', payload: { tokens: finalBuf, sessionId } });
          finalBuf = '';
          finalSize = 0;
        }
      };

      // Collect potential new tool calls in relaunch
      const relaunchToolCallMap: Record<string, { id: string; name: string; arguments: string }> = {};
      const relaunchToolOrder: string[] = [];
      let doneR = false;

      while (!doneR) {
        const { done, value } = await relaunchReader.read();
        if (done) { doneR = true; break; }
        const c = new TextDecoder().decode(value);
        const ls = c.split('\n');
        for (const l of ls) {
          if (!l.startsWith('data: ')) continue;
          const d = l.slice(6);
          if (d === '[DONE]') { doneR = true; break; }
          try {
            const p = JSON.parse(d);
            const del = p.choices?.[0]?.delta;
            if (del?.tool_calls) {
              for (const toolCall of del.tool_calls) {
                const id = toolCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                if (!relaunchToolCallMap[id]) {
                  relaunchToolCallMap[id] = { id, name: toolCall.function?.name || '', arguments: toolCall.function?.arguments || '' };
                  relaunchToolOrder.push(id);
                } else {
                  if (toolCall.function?.name) relaunchToolCallMap[id].name = toolCall.function.name;
                  if (toolCall.function?.arguments) relaunchToolCallMap[id].arguments += toolCall.function.arguments;
                }
              }
            } else {
              const t = del?.content ?? del?.message?.content ?? (typeof del?.text === 'string' ? del.text : undefined) ?? (typeof (del as any)?.output_text === 'string' ? (del as any).output_text : undefined);
              if (t) {
                finalAccum += t;
                finalBuf += t;
                finalSize++;
                if (finalSize >= BATCH_SIZE) {
                  await flushFinal();
                }
              }
            }
          } catch {}
        }
      }
      await flushFinal();
      logger.info(`[Groq OSS] 📝 Contenu relance accumulé : ${finalAccum}`);

      // If no new tool calls were requested, we have a final answer
      if (relaunchToolOrder.length === 0) {
        const safeFinal = (finalAccum || '').trim();
        await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId, fullResponse: safeFinal } });
        if (safeFinal) {
          try {
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const css2 = ChatSessionService.getInstance();
            await css2.addMessageWithToken(sessionId, { role: 'assistant', content: safeFinal, timestamp: new Date().toISOString() } as any, userToken);
          } catch {}
        }
        logger.info(`[Groq OSS] ✅ EXÉCUTION TERMINÉE (round ${round}) SANS NOUVEAUX OUTILS`);
        return NextResponse.json({ success: true, completed: true, response: safeFinal });
      }

      // Else: execute new tool calls, persist, and loop again
      const outgoingAssistantToolCalls2: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
      const toolResultMessages2: any[] = [];

      for (const id of relaunchToolOrder) {
        const call = relaunchToolCallMap[id];
        if (!call?.name) continue;
        const callId = call.id || id;
        outgoingAssistantToolCalls2.push({ id: callId, type: 'function', function: { name: call.name, arguments: call.arguments } });
      }
      if (outgoingAssistantToolCalls2.length > 0) {
        try { await channel.send({ type: 'broadcast', event: 'llm-tool-calls', payload: { sessionId, tool_calls: outgoingAssistantToolCalls2 } }); } catch {}
        try {
          const { ChatSessionService } = await import('@/services/chatSessionService');
          const css = ChatSessionService.getInstance();
          await css.addMessageWithToken(sessionId, { role: 'assistant', content: null, tool_calls: outgoingAssistantToolCalls2, timestamp: new Date().toISOString() } as any, userToken);
        } catch (e) {
          logger.error('[Groq OSS] ❌ Persist assistant tool_calls (relaunch) failed:', e);
        }
      }

      for (const id of relaunchToolOrder) {
        const call = relaunchToolCallMap[id];
        if (!call?.name) continue;
        const callId = call.id || id;
        const args = (() => { try { return JSON.parse(call.arguments || '{}'); } catch { return {}; } })();
        try {
          const toolCallPromise = agentApiV2Tools.executeTool(call.name, args, userToken);
          const timeoutPromise = new Promise((resolve) => { setTimeout(() => resolve({ success: false, error: 'Timeout tool call (15s)' }), 15000); });
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
            } catch { return { success: false, error: 'tool_result_normalization_error' }; }
          })() as any;
          normalized.tool_name = call.name; normalized.tool_args = args; normalized.timestamp = new Date().toISOString();
          if (!('code' in normalized) && (normalized.error || normalized.success === false)) normalized.code = detectErrorCodeFromText(String(normalized.error || normalized.message || ''));
          const isError = normalized.success === false || !!(normalized as any).error;
          let contentStr = JSON.stringify(normalized);
          // ✅ CORRECTION: Augmenter la limite de 8KB à 64KB pour éviter la troncature
          const MAX = 64 * 1024; // 64KB au lieu de 8KB
          if (contentStr.length > MAX) {
            contentStr = JSON.stringify({ success: normalized.success === true, code: normalized.code, message: 'Résultat tronqué - données trop volumineuses', truncated: true, original_size: contentStr.length, tool_name: normalized.tool_name, tool_args: normalized.tool_args, timestamp: normalized.timestamp });
          }
          toolResultMessages2.push({ role: 'tool' as const, tool_call_id: callId, name: call.name, content: contentStr });
          try {
            await channel.send({ type: 'broadcast', event: 'llm-tool-result', payload: { sessionId, tool_name: call.name, tool_call_id: callId, result: (()=>{ try { return JSON.parse(contentStr); } catch { return { success: !isError, message: 'truncated' }; } })(), success: !isError } });
          } catch (e) { logger.error('[Groq OSS] ❌ Broadcast tool result (relaunch) failed:', e); }
          try {
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const css = ChatSessionService.getInstance();
            await css.addMessageWithToken(sessionId, { role: 'tool', tool_call_id: callId, name: call.name, content: contentStr, timestamp: new Date().toISOString() } as any, userToken);
          } catch (e) { logger.error('[Groq OSS] ❌ Persist tool result (relaunch) failed:', e); }
        } catch (err) {
          const normalized = { success: false, code: detectErrorCodeFromText(err instanceof Error ? err.message : String(err)), message: `❌ ÉCHEC : ${err instanceof Error ? err.message : String(err)}`, details: { raw: err instanceof Error ? err.stack || err.message : String(err) }, tool_name: call.name, tool_args: args, timestamp: new Date().toISOString() } as const;
          let contentStr = JSON.stringify(normalized);
          // ✅ CORRECTION: Augmenter la limite de 8KB à 64KB pour éviter la troncature
          const MAX = 64 * 1024; // 64KB au lieu de 8KB
          if (contentStr.length > MAX) {
            contentStr = JSON.stringify({ success: false, code: normalized.code, message: 'Résultat tronqué - données trop volumineuses', truncated: true, original_size: contentStr.length, tool_name: normalized.tool_name, tool_args: normalized.tool_args, timestamp: normalized.timestamp });
          }
          toolResultMessages2.push({ role: 'tool' as const, tool_call_id: callId, name: call.name, content: contentStr });
          try { await channel.send({ type: 'broadcast', event: 'llm-tool-result', payload: { sessionId, tool_name: call.name, tool_call_id: callId, result: (()=>{ try { return JSON.parse(contentStr); } catch { return { success: false, message: 'truncated' }; } })(), success: false } }); } catch (e) { logger.error('[Groq OSS] ❌ Broadcast tool error (relaunch) failed:', e); }
          try {
            const { ChatSessionService } = await import('@/services/chatSessionService');
            const css = ChatSessionService.getInstance();
            await css.addMessageWithToken(sessionId, { role: 'tool', tool_call_id: callId, name: call.name, content: contentStr, timestamp: new Date().toISOString() } as any, userToken);
          } catch (e) { logger.error('[Groq OSS] ❌ Persist tool error (relaunch) failed:', e); }
        }
      }

      // Prepare next round messages with assistant tool_calls and tool results
      const toolAssistantMsg2 = { role: 'assistant' as const, content: null, tool_calls: outgoingAssistantToolCalls2 };
      currentMessages = [...currentMessages, toolAssistantMsg2, ...toolResultMessages2];

      // Continue loop for possible further chaining
      logger.info(`[Groq OSS] 🔁 Tool chaining round ${round} exécuté (${relaunchToolOrder.length} appels)`);
    }

    // If we exit the loop without a final answer, fallback to building a concrete message
    let safeFinal = '';
    try {
      const lastToolMsg = toolResultMessages.slice(-1)[0];
      if (lastToolMsg) {
        const parsed = JSON.parse(lastToolMsg.content);
        const toolName = lastToolMsg.name || parsed?.tool_name || 'outil';
        safeFinal = buildConcreteFallback(toolName, lastToolMsg.content);
      }
    } catch {}
    // Use structured error-handler template if still empty
    if (!safeFinal) {
      safeFinal = buildOneShotSystemInstruction();
    }
    await channel.send({ type: 'broadcast', event: 'llm-complete', payload: { sessionId, fullResponse: safeFinal } });
    if (safeFinal) {
      try {
        const { ChatSessionService } = await import('@/services/chatSessionService');
        const css2 = ChatSessionService.getInstance();
        await css2.addMessageWithToken(sessionId, { role:'assistant', content: safeFinal, timestamp: new Date().toISOString() } as any, userToken);
      } catch {}
    }

    logger.info(`[Groq OSS] ✅ EXÉCUTION TERMINÉE AVEC OUTILS (loop épuisée)`);
    return NextResponse.json({ success: true, completed: true, response: safeFinal });
  }

  // No tool call → complete (garantir une réponse non vide)
  let finalText = (accumulatedContent || '').trim();
  if (!finalText) {
    finalText = buildOneShotSystemInstruction();
  }
  
  await channel.send({ 
    type: 'broadcast', 
    event: 'llm-complete', 
    payload: { sessionId, fullResponse: finalText } 
  });
  
  // 🎯 LOG DE FIN D'EXÉCUTION
  logger.info(`[Groq OSS] ✅ EXÉCUTION TERMINÉE AVEC SUCCÈS:`);
  logger.info(`[Groq OSS]    Réponse finale: ${finalText.length} caractères`);
  logger.info(`[Groq OSS]    Contenu: ${finalText.substring(0, 200)}${finalText.length > 200 ? '...' : ''}`);
  logger.info(`[Groq OSS]    Session ID: ${sessionId}`);
  logger.info(`[Groq OSS]    Streaming: ${payload.stream ? 'Activé' : 'Désactivé'}`);
  logger.info(`[Groq OSS]    🔚 FIN DE L'EXÉCUTION GROQ OSS`);
  
  return NextResponse.json({ success: true, completed: true, response: finalText });
}