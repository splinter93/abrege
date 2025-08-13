import { NextResponse } from 'next/server';
import { GroqProvider } from './providers';
import type { AppContext } from './types';
import { ChatMessage } from '@/types/chat';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { buildObservation } from '@/services/toolFlowUtils';
import { simpleLogger as logger } from '@/utils/logger';
import { buildOneShotSystemInstruction } from './templates';
import { ToolCallManager } from './toolCallManager';
import { ChatHistoryCleaner } from '@/services/chatHistoryCleaner';

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
  
  // 🎯 GATING DES TOOLS : Vérifier les capacités API v2 (déplacé plus bas)
  logger.dev(`[Groq OSS] 🔧 Function calling - gating selon les capacités API v2`);
  
  // 🔧 NOUVEAU: Nettoyer l'historique avant traitement
  const historyCleaner = ChatHistoryCleaner.getInstance();
  const cleanedHistory = historyCleaner.cleanHistory(sessionHistory, {
    maxMessages: 30, // Limiter à 30 messages pour éviter les tokens excessifs
    removeInvalidToolMessages: true,
    removeDuplicateMessages: true,
    removeEmptyMessages: true,
    preserveSystemMessages: true
  });

  // 🔧 VALIDATION: Vérifier la cohérence des tool calls
  const consistencyCheck = historyCleaner.validateToolCallConsistency(cleanedHistory);
  if (!consistencyCheck.isValid) {
    logger.warn(`[Groq OSS] ⚠️ Incohérences détectées dans l'historique:`, consistencyCheck.issues);
  }

  // 🔧 STATISTIQUES: Log des statistiques de l'historique
  const historyStats = historyCleaner.getHistoryStats(cleanedHistory);
  logger.info(`[Groq OSS] 📊 Statistiques de l'historique:`, historyStats);

  // 🔧 Sanitize l'historique: supprimer les messages tool invalides (sans name ou tool_call_id)
  const sanitizedHistory = cleanedHistory.filter((msg: ChatMessage) => {
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
      
      // 🔧 CORRECTION: Transmettre TOUS les champs des tool calls pour les messages assistant
      if (msg.role === 'assistant' && (msg as any).tool_calls) {
        mappedMsg.tool_calls = (msg as any).tool_calls;
      }
      
      // 🔧 CORRECTION: Transmettre TOUS les champs pour les messages tool
      if (msg.role === 'tool') {
        if ((msg as any).tool_call_id) {
          mappedMsg.tool_call_id = (msg as any).tool_call_id;
        }
        if ((msg as any).name) {
          mappedMsg.name = (msg as any).name;
        }
        // 🔧 NOUVEAU: Transmettre aussi tool_name si présent
        if ((msg as any).tool_name) {
          mappedMsg.name = (msg as any).tool_name;
        }
      }
      
      return mappedMsg;
    }),
    { role: 'user' as const, content: message }
  ];

  await agentApiV2Tools.waitForInitialization();
  
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = process.env.GROQ_API_KEY as string;

  // 🎯 GATING DES TOOLS : Vérifier les capacités API v2
  const hasApiV2Capabilities = agentConfig?.api_v2_capabilities?.length > 0;
  const tools = hasApiV2Capabilities ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig) : undefined;
  
  logger.info(`[Groq OSS] 🎯 GATING DES TOOLS: ${hasApiV2Capabilities ? 'ACTIVÉ' : 'DÉSACTIVÉ'} (${agentConfig?.api_v2_capabilities?.length || 0} capacités)`);
  
  // ✅ ANTI-SILENCE : Configuration optimisée pour la relance
  const isToolRelance = sanitizedHistory.some(msg => (msg as any).role === 'developer');
  
  const apiConfig = agentConfig?.api_config || {};
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages,
    stream: false, // ✅ DÉSACTIVÉ : Plus de streaming
    // ⭐ ANTI-SILENCE : Configuration optimisée pour la relance
    temperature: isToolRelance ? 0.2 : config.temperature, // Plus déterministe après tool execution
    max_completion_tokens: config.max_tokens,
    top_p: config.top_p,
    reasoning_effort: apiConfig.reasoning_effort ?? groqProvider.config.reasoningEffort,
    // 🎯 GATING DES TOOLS : Conditionnel selon les capacités
    ...(tools && { tools, tool_choice: 'auto' as const })
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

  // ✅ NOUVEAU : Appel simple à l'API Groq sans streaming avec retry réseau
  let response: Response | undefined;
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) break; // Succès, sortir de la boucle
      
      // Erreur HTTP, essayer de relancer
      if (retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // Backoff exponentiel
        logger.warn(`[Groq OSS] ⚠️ Erreur HTTP ${response.status}, retry ${retryCount + 1}/${maxRetries} dans ${backoffDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        retryCount++;
      } else {
        break; // Plus de retries
      }
    } catch (fetchError) {
      if (retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000;
        logger.warn(`[Groq OSS] ⚠️ Erreur réseau, retry ${retryCount + 1}/${maxRetries} dans ${backoffDelay}ms:`, fetchError);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        retryCount++;
      } else {
        throw fetchError; // Plus de retries, propager l'erreur
      }
    }
  }

  // Vérifier que la réponse a été obtenue
  if (!response) {
    throw new Error('Échec de l\'appel API après tous les retries');
  }

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

  // 🎯 NOUVELLE POLITIQUE : Déterminer si des tool_calls sont présents
  const hasToolCalls = Array.isArray(choice.message?.tool_calls) && choice.message.tool_calls.length > 0;
  const toolCalls = choice.message?.tool_calls || [];
  
  // 🚨 POLITIQUE D'INTERPRÉTATION : Ignorer le contenu si tool_calls présents
  let contentForUi = '';
  let reasoning = choice.reasoning || '';
  
  if (hasToolCalls) {
    // 🔧 TOOL CALLS DÉTECTÉS : Ignorer le contenu "social" co-émis
    contentForUi = ''; // Ne pas diffuser en UI
    logger.info(`[Groq OSS] 🚨 IGNORED_ASSISTANT_CONTENT_DUE_TO_TOOL_CALLS: true`);
    logger.info(`[Groq OSS] 🚨 CONTENU ASSISTANT IGNORÉ (${choice.message?.content?.length || 0} caractères) - Présence de tool_calls`);
    logger.info(`[Groq OSS] 🔧 TOOL CALLS REÇUS: ${toolCalls.length} appels`);
  } else {
    // 📝 RÉPONSE FINALE NORMALE : Traiter le contenu normalement
    contentForUi = choice.message?.content || '';
    logger.info(`[Groq OSS] 📝 CONTENU REÇU: ${contentForUi.length} caractères`);
    if (reasoning) {
      logger.info(`[Groq OSS] 🧠 REASONING REÇU: ${reasoning.length} caractères`);
    }
  }

  // ✅ NOUVEAU : Gestion des tool calls si présents
  if (toolCalls.length > 0) {
    // 🔧 LIMITE DE SÉCURITÉ: Maximum 10 tool calls par appel
    if (toolCalls.length > 10) {
      logger.warn(`[Groq OSS] ⚠️ Trop de tool calls (${toolCalls.length}) - limité à 10 maximum`);
      toolCalls.splice(10); // Garder seulement les 10 premiers
    }
    
    // 🎯 PERSISTANCE IMMÉDIATE : Message assistant(tool_calls) AVANT exécution
    logger.info(`[Groq OSS] 💾 PERSISTANCE IMMÉDIATE: Message assistant(tool_calls) avec content=""`);
    logger.info(`[Groq OSS] 💾 CONTENU ASSISTANT PERSISTÉ: "" (vide - présence de tool_calls)`);
    logger.info(`[Groq OSS] 💾 TOOL_CALLS PERSISTÉS: ${toolCalls.length} appels`);
    
    logger.info(`[Groq OSS] 🔧 EXÉCUTION DES TOOL CALLS (${toolCalls.length} tools)...`);
    
    const toolCallManager = ToolCallManager.getInstance();
    const toolResults: Array<{
      tool_call_id: string;
      name: string;
      result: any;
      success: boolean;
    }> = [];

    // 🔧 DÉDOUPLICATION DANS LE BATCH: éviter d'exécuter deux fois le même tool (même nom+args)
    const seenBatchSignatures = new Set<string>();
    const makeSignature = (tc: any) => {
      try {
        const argsObj = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {});
        const sorted = Object.keys(argsObj).sort().reduce((acc: any, k: string) => { acc[k] = argsObj[k]; return acc; }, {});
        return `${tc.function?.name || 'unknown'}::${JSON.stringify(sorted)}`;
      } catch {
        return `${tc.function?.name || 'unknown'}::${String(tc.function?.arguments || '')}`;
      }
    };
    
    // 🔧 EXÉCUTION SÉQUENTIELLE DES TOOLS
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const sig = makeSignature(toolCall);
      if (seenBatchSignatures.has(sig)) {
        logger.warn(`[Groq OSS] ⚠️ Tool ${toolCall.function?.name} ignoré (doublon dans le batch)`);
        toolResults.push({
          tool_call_id: toolCall.id,
          name: toolCall.function?.name || 'unknown',
          result: { success: false, error: 'Duplicate tool call in batch', code: 'DUPLICATE_IN_BATCH' },
          success: false
        });
        continue;
      }
      seenBatchSignatures.add(sig);

      logger.info(`[Groq OSS] 🔧 Exécution du tool ${i + 1}/${toolCalls.length}: ${toolCall.function?.name}`);
      
      try {
        const result = await toolCallManager.executeToolCall(toolCall, userToken, 3, { batchId });
        
        toolResults.push({
          tool_call_id: result.tool_call_id,
          name: result.name,
          result: result.result,
          success: result.success
        });
        
        logger.info(`[Groq OSS] ✅ Tool ${result.name} (${i + 1}/${toolCalls.length}) exécuté avec succès`);
        
      } catch (err) {
        logger.error(`[Groq OSS] ❌ Erreur lors de l'exécution du tool ${i + 1}/${toolCalls.length}:`, err);
        
        const fallbackResult = {
          tool_call_id: toolCall.id,
          name: toolCall.function?.name || 'unknown',
          result: { 
            success: false, 
            error: 'Erreur ToolCallManager',
            code: 'TOOL_MANAGER_ERROR'
          },
          success: false
        };
        
        toolResults.push(fallbackResult);
      }
    }
    
    logger.info(`[Groq OSS] 🔧 EXÉCUTION TERMINÉE: ${toolResults.length}/${toolCalls.length} tools traités`);
    
    // 🔧 RELANCE AUTOMATIQUE AVEC RÉSULTATS DES TOOLS
    logger.info(`[Groq OSS] 🔄 RELANCE AUTOMATIQUE AVEC RÉSULTATS DES TOOLS...`);
    
    // 🎯 COMPTEUR DE RELANCES : Limiter à 1-2 pour éviter les boucles
    const relanceCount = sanitizedHistory.filter(msg => (msg as any).role === 'assistant' && (msg as any).tool_calls).length;
    const maxRelances = 2;
    
    if (relanceCount >= maxRelances) {
      logger.warn(`[Groq OSS] ⚠️ LIMITE DE RELANCES ATTEINTE: ${relanceCount}/${maxRelances} - Arrêt de la relance`);
      return NextResponse.json({
        success: true,
        content: contentForUi,
        reasoning,
        tool_calls: toolCalls,
        tool_results: toolResults,
        sessionId,
        is_relance: false,
        relance_limit_reached: true
      });
    }
    
    logger.info(`[Groq OSS] 🔄 RELANCE ${relanceCount + 1}/${maxRelances} - Progression normale`);
    
    // Mapper l'historique au format attendu par l'API (comme pour le premier appel)
    const mappedHistoryForRelance = sanitizedHistory.map((msg: ChatMessage) => {
      const mapped: any = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content ?? ''
      };
      if (msg.role === 'assistant' && (msg as any).tool_calls) {
        mapped.tool_calls = (msg as any).tool_calls;
      }
      if (msg.role === 'tool') {
        if ((msg as any).tool_call_id) mapped.tool_call_id = (msg as any).tool_call_id;
        if ((msg as any).name) mapped.name = (msg as any).name;
        if ((msg as any).tool_name) mapped.name = (msg as any).tool_name;
      }
      return mapped;
    });

    // 🔧 COUCHE DE RESTITUTION CONVERSATIONNELLE ASSOUPLIE - Préserve le contexte original
    const postToolsStyleSystem = [
      '🗣️ GUIDE CONVERSATIONNEL - Suis cette structure tout en préservant le contexte :',
      '',
      'Après chaque résultat d\'outil, utilise cette structure adaptative :',
      '',
      '1. **CONFIRMATION CONTEXTUELLE** :',
      '   Confirme ce que tu viens de faire en lien DIRECT avec la demande de l\'utilisateur.',
      '   Exemple : "J\'ai créé le dossier *Projets 2024* comme vous l\'avez demandé."',
      '   Exemple : "Votre note a été ajoutée à la section *Budget* comme souhaité."',
      '   IMPORTANT : Garde le lien avec la demande initiale !',
      '',
      '2. **RÉSUMÉ UTILISATEUR** :',
      '   En 1-2 phrases, explique ce que cela change pour l\'utilisateur.',
      '   Exemple : "Vous pouvez maintenant organiser vos projets dans cette nouvelle structure."',
      '   Exemple : "Votre budget est maintenant organisé et prêt à être utilisé."',
      '',
      '3. **AFFICHAGE INTELLIGENT** :',
      '   - Résultats courts → affiche directement (pas de JSON)',
      '   - Résultats longs → montre 3-5 premières lignes + "..."',
      '   - Résultats techniques → propose commande pour voir le détail',
      '   INTERDICTION : AUCUN JSON brut, AUCUNE donnée technique brute',
      '',
      '4. **PROCHAINE ÉTAPE CONTEXTUELLE** :',
      '   Propose 1 action qui fait suite logique à ce qui vient d\'être fait.',
      '   Exemple : "Voulez-vous que j\'ajoute des sous-dossiers dans ce nouveau dossier ?"',
      '   Exemple : "Souhaitez-vous que j\'ajoute d\'autres catégories au budget ?"',
      '   IMPORTANT : Reste dans le contexte de la demande initiale !',
      '',
      '✅ **TON ET CONTEXTE :**',
      '- Chaleureux, empathique, proactif',
      '- Garde TOUJOURS le fil de la conversation originale',
      '- Réponse totale : 4-6 phrases maximum',
      '- Structure : 1 confirmation contextuelle + 1-2 résumé + 1 affichage + 1 prochaine étape',
      '',
      '🔒 **RÈGLE D\'OR :** Ne perds JAMAIS le fil de la demande initiale !'
    ].join('\n');

    // 🚨 NOUVELLE COUCHE : Gestion d'erreur intelligente avec possibilité de correction
    const errorHandlingSystem = [
      '🚨 GESTION D\'ERREUR INTELLIGENTE - Tu PEUX relancer des tool calls corrigés :',
      '',
      'Si tu reçois des erreurs de tools, tu DOIS :',
      '',
      '1. **ANALYSER L\'ERREUR** : Comprendre pourquoi le tool a échoué',
      '   - Paramètres manquants ou invalides ?',
      '   - Permissions insuffisantes ?',
      '   - Ressource introuvable ?',
      '   - Validation échouée ?',
      '',
      '2. **DÉCIDER DE L\'ACTION** :',
      '   ✅ SI tu peux corriger → Relance le tool call avec les bons paramètres',
      '   ❌ SI tu ne peux pas corriger → Informe l\'utilisateur clairement',
      '',
      '3. **CORRECTION AUTOMATIQUE** (si possible) :',
      '   - Ajouter des paramètres manquants',
      '   - Corriger les valeurs invalides',
      '   - Adapter aux permissions disponibles',
      '   - Utiliser des alternatives valides',
      '',
      '4. **INFORMATION UTILISATEUR** (si correction impossible) :',
      '   - Expliquer l\'erreur en termes simples',
      '   - Proposer des solutions alternatives',
      '   - Demander des informations supplémentaires',
      '',
      '🔧 **EXEMPLE DE CORRECTION :**',
      'Erreur : "notebook_id manquant" → Relance avec notebook_id valide',
      'Erreur : "permission refusée" → Informe l\'utilisateur des limitations',
      'Erreur : "validation échouée" → Corrige les paramètres et relance',
      '',
      '🎯 **OBJECTIF :** Maintenir le fil de la conversation, ne pas "sauter" vers autre chose !'
    ].join('\n');

    // 🧠 NOUVELLE COUCHE : Préservation du contexte conversationnel
    const contextPreservationSystem = [
      '🧠 PRÉSERVATION DU CONTEXTE - Ne perds JAMAIS le fil de la conversation :',
      '',
      'RÈGLES STRICTES DE CONTEXTUALISATION :',
      '',
      '1. **GARDE LA DEMANDE INITIALE EN TÊTE** :',
      '   - L\'utilisateur a demandé quelque chose de précis',
      '   - Tu viens d\'exécuter des tools pour répondre à cette demande',
      '   - Ta réponse DOIT être en lien DIRECT avec cette demande',
      '',
      '2. **CONFIRMATION CONTEXTUELLE OBLIGATOIRE** :',
      '   - Commence TOUJOURS par confirmer ce que tu as fait',
      '   - Utilise des phrases comme : "J\'ai [action] comme vous l\'avez demandé"',
      '   - Ne dis JAMAIS "désolé" si tu as réussi !',
      '',
      '3. **SUITE LOGIQUE DANS LE CONTEXTE** :',
      '   - Propose des actions qui font suite à ce qui vient d\'être fait',
      '   - Reste dans le même domaine que la demande initiale',
      '   - Ne "saute" JAMAIS vers un autre sujet',
      '',
      '4. **EXEMPLE DE BONNE CONTEXTUALISATION** :',
      '   Demande : "Crée un dossier Projets"',
      '   ✅ Bonne réponse : "J\'ai créé le dossier *Projets* comme vous l\'avez demandé. Vous pouvez maintenant..."',
      '   ❌ Mauvaise réponse : "Je suis désolé pour la création du dossier..."',
      '',
      '🔒 **RÈGLE D\'OR :** Si tu as réussi, confirme le succès. Si tu as échoué, explique l\'échec. MAIS garde TOUJOURS le contexte !'
    ].join('\n');

    // 🎯 COUCHE SYSTÈME FUSIONNÉE (max ~200-300 tokens) - Éviter bloat/contradictions
    const fusedSystemLayer = [
      '🎯 INSTRUCTIONS POST-TOOL FUSIONNÉES :',
      '',
      '1. **FOCALISATION ABSOLUE** : Réponds UNIQUEMENT au message actuel, pas à l\'historique',
      '2. **CONFIRMATION CONTEXTUELLE** : "En réponse à votre demande de [action], j\'ai [action réalisée]"',
      '3. **RÉSUMÉ UTILISATEUR** : En 1-2 phrases, ce que cela change pour l\'utilisateur',
      '4. **PROCHAINE ÉTAPE** : Suggestion logique dans le contexte de la demande actuelle',
      '5. **TON** : Chaleureux, empathique, proactif - MAX 4-6 phrases totales',
      '',
      '🚨 **INTERDICTIONS** : Pas de JSON brut, pas de réponse aux messages précédents, pas de bloat technique'
    ].join('\n');

    const relanceMessages = [
      { role: 'system' as const, content: systemContent },
      // 🎯 COUCHE SYSTÈME FUSIONNÉE (éviter bloat/contradictions)
      { role: 'system' as const, content: fusedSystemLayer },
      // 🎯 MESSAGE ACTUEL EN PREMIER (priorité absolue) - COPIE EXACTE
      { role: 'user' as const, content: message }, // Pas de préfixe, copie exacte
      // Message assistant contenant les tool_calls retournés par le modèle
      { role: 'assistant' as const, content: '', tool_calls: toolCalls },
      // Messages tool correspondant aux résultats exécutés
      ...toolResults.map(result => ({
        role: 'tool' as const,
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: (() => { try { return JSON.stringify(result.result); } catch { return String(result.result); } })(),
        timestamp: new Date().toISOString()
      })),
      // 📚 HISTORIQUE EN DERNIER (pour contexte seulement)
      ...mappedHistoryForRelance
    ];
    
    // 🔧 DÉCISION INTELLIGENTE : Réactiver les tools si des erreurs sont présentes
    const hasErrors = toolResults.some(result => !result.success);
    const shouldReactivateTools = hasErrors && toolResults.length > 0;
    
    const relancePayload = {
      model: config.model,
      messages: relanceMessages,
      stream: false,
      temperature: 0.2, // Plus déterministe pour la relance
      max_completion_tokens: config.max_tokens,
      top_p: config.top_p,
      // 🔧 GESTION INTELLIGENTE : Réactiver les tools si correction nécessaire
      ...(shouldReactivateTools && { 
        tools: agentApiV2Tools.getToolsForFunctionCalling(),
        tool_choice: 'auto' as const
      }),
      // 🔧 ANTI-BOUCLE : Pas de tools si tout s'est bien passé
      ...(!shouldReactivateTools && { 
        tools: [],
        tool_choice: 'none' as const
      })
    };
    
    logger.info(`[Groq OSS] 🔄 RELANCE: Envoi du payload de relance...`);
    
    // 🔧 LOGS DÉTAILLÉS DE LA RELANCE AVEC COUCHE SYSTÈME FUSIONNÉE
    logger.info(`[Groq OSS] 🔄 STRUCTURE DE LA RELANCE AVEC COUCHE SYSTÈME FUSIONNÉE:`);
    logger.info(`[Groq OSS]    1. System principal: ${systemContent.substring(0, 100)}...`);
    logger.info(`[Groq OSS]    2. 🎯 COUCHE SYSTÈME FUSIONNÉE: ${fusedSystemLayer.length} caractères`);
    logger.info(`[Groq OSS]    3. 🎯 MESSAGE ACTUEL (PRIORITÉ ABSOLUE): ${message.substring(0, 100)}...`);
    logger.info(`[Groq OSS]    4. Assistant tool_calls: ${toolCalls.length}`);
    logger.info(`[Groq OSS]    5. Résultats tools: ${toolResults.length} résultats`);
    logger.info(`[Groq OSS]    6. 📚 HISTORIQUE (contexte seulement): ${sanitizedHistory.length} messages`);
    logger.info(`[Groq OSS]    7. 🔍 ANALYSE ERREURS: ${toolResults.filter(r => !r.success).length} erreurs détectées`);
    logger.info(`[Groq OSS]    8. 🔧 DÉCISION TOOLS: ${shouldReactivateTools ? 'RÉACTIVATION' : 'DÉSACTIVATION'} des tools`);
    logger.info(`[Groq OSS]    9. 🔒 FOCALISATION: Répondre UNIQUEMENT au message actuel, pas à l'historique`);
    
    try {
      const relanceResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(relancePayload)
      });
      
      if (!relanceResponse.ok) {
        const errorText = await relanceResponse.text();
        logger.error(`[Groq OSS] ❌ Erreur relance API:`, errorText);
        throw new Error(`Relance API error: ${relanceResponse.status} - ${errorText}`);
      }
      
      const relanceData = await relanceResponse.json();
      const relanceChoice = relanceData.choices?.[0];
      
      if (relanceChoice) {
        const relanceContent = relanceChoice.message?.content || '';
        const relanceReasoning = relanceChoice.reasoning || '';
        
        logger.info(`[Groq OSS] ✅ RELANCE RÉUSSIE: ${relanceContent.length} caractères`);
        
        return NextResponse.json({
          success: true,
          content: relanceContent,
          reasoning: relanceReasoning,
          tool_calls: toolCalls,
          tool_results: toolResults,
          sessionId,
          is_relance: true
        });
      }
      
    } catch (relanceError) {
      logger.error(`[Groq OSS] ❌ Erreur lors de la relance:`, relanceError);
      // En cas d'erreur de relance, retourner quand même les résultats des tools
    }
    
    // ✅ Retourner la réponse avec les résultats des tools (sans relance)
    logger.info(`[Groq OSS] ✅ EXÉCUTION TERMINÉE AVEC TOOLS (SANS RELANCE)`);
    
    return NextResponse.json({
      success: true,
      content: contentForUi,
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
    content: contentForUi,
    reasoning,
    tool_calls: [],
    sessionId
  });
}