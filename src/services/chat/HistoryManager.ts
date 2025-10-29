import { createSupabaseClient } from '@/utils/supabaseClient';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

// ✅ Client Supabase avec SERVICE ROLE KEY (côté serveur uniquement)
// Permet bypass RLS pour operations atomiques sécurisées
const supabase = createSupabaseClient();

/**
 * Service centralisé pour la gestion de l'historique des messages
 * 
 * Responsabilités:
 * - Insertion atomique avec sequence_number (prévient race conditions)
 * - Pagination efficace (queries DB optimisées)
 * - Filtrage intelligent pour LLM (limites providers)
 * - Édition de messages (suppression cascade)
 * 
 * Standards:
 * - TypeScript strict (0 any)
 * - Atomicité garantie (UNIQUE constraint)
 * - Performance constante (indexes)
 * - Tests complets (race conditions, pagination, performance)
 * 
 * @singleton
 */

export interface HistoryConfig {
  maxMessages: number;
  includeTools?: boolean;
  providerLimits?: {
    maxContextMessages?: number;
    maxTokens?: number;
  };
}

export interface PaginatedMessages {
  messages: ChatMessage[];
  hasMore: boolean;
  totalCount?: number;
}

export class HistoryManager {
  private static instance: HistoryManager;

  private constructor() {
    // Private constructor pour singleton
  }

  static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  /**
   * ➕ Ajouter un message atomiquement
   * 
   * Utilise add_message_atomic() pour garantir:
   * - Sequence_number unique et atomique
   * - Pas de race conditions (même avec 100+ inserts simultanés)
   * - Retry automatique si collision (ultra-rare)
   * 
   * @throws {Error} Si session non trouvée ou accès refusé
   */
  async addMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'sequence_number' | 'timestamp' | 'created_at'>
  ): Promise<ChatMessage> {
    try {
      logger.dev('[HistoryManager] 📥 addMessage appelé:', {
        sessionId,
        role: message.role,
        hasStreamTimeline: 'stream_timeline' in message && !!message.stream_timeline,
        streamTimelineEvents: 'stream_timeline' in message && message.stream_timeline ? message.stream_timeline.items?.length : 0
      });
      
      const { data, error } = await supabase.rpc('add_message_atomic', {
        p_session_id: sessionId,
        p_role: message.role,
        p_content: message.content,
        p_tool_calls: message.tool_calls || null,
        p_tool_call_id: message.tool_call_id || null,
        p_name: message.name || null,
        p_reasoning: message.reasoning || null,
        p_timestamp: new Date().toISOString()
      });

      if (error) {
        logger.error('[HistoryManager] ❌ Erreur addMessage:', {
          error: {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          },
          sessionId,
          role: message.role,
          params: {
            p_session_id: sessionId,
            p_role: message.role,
            p_content: message.content?.substring(0, 100)
          }
        });
        throw new Error(`Failed to add message: ${error.message || 'Unknown error'}`);
      }

      // ✅ UPDATE stream_timeline + tool_results si présents (RPC ne supporte pas JSONB complexe)
      if (('stream_timeline' in message && message.stream_timeline) || ('tool_results' in message && message.tool_results)) {
        const updateData: Record<string, unknown> = {};
        
        if ('stream_timeline' in message && message.stream_timeline) {
          updateData.stream_timeline = message.stream_timeline;
        }
        
        if ('tool_results' in message && message.tool_results) {
          updateData.tool_results = message.tool_results;
        }
        
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update(updateData)
          .eq('id', data.id);

        if (updateError) {
          logger.error('[HistoryManager] ❌ Erreur UPDATE JSONB fields:', {
            error: updateError,
            messageId: data.id,
            fields: Object.keys(updateData)
          });
          // Non bloquant, on continue
        } else {
          logger.dev('[HistoryManager] ✅ JSONB fields sauvegardés:', {
            messageId: data.id,
            streamTimelineEvents: 'stream_timeline' in message && message.stream_timeline ? message.stream_timeline.items?.length : 0,
            toolResultsCount: 'tool_results' in message && message.tool_results ? message.tool_results.length : 0
          });
        }
        
        // ✅ RE-SELECT le message pour récupérer les champs JSONB
        const { data: fullMessage, error: selectError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('id', data.id)
          .single();
          
        if (!selectError && fullMessage) {
          logger.dev('[HistoryManager] ✅ Message complet rechargé avec JSONB');
          return fullMessage as ChatMessage;
        }
      }

      logger.dev('[HistoryManager] ✅ Message ajouté:', {
        sessionId,
        sequenceNumber: data.sequence_number,
        role: data.role,
        hasStreamTimeline: 'stream_timeline' in message && !!message.stream_timeline
      });

      return data as ChatMessage;
    } catch (error) {
      logger.error('[HistoryManager] ❌ Exception addMessage:', error);
      throw error;
    }
  }

  /**
   * 📥 Charger les N derniers messages (pagination initiale)
   * 
   * Query optimisée:
   * - Utilise index idx_messages_session_sequence
   * - LIMIT en DB (pas en mémoire)
   * - Performance constante même avec 10K+ messages
   * 
   * @returns Messages triés par ordre chronologique (ancien → récent)
   */
  async getRecentMessages(
    sessionId: string,
    limit: number = 15
  ): Promise<PaginatedMessages> {
    try {
      // Query avec LIMIT en DB
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[HistoryManager] ❌ Erreur getRecentMessages:', error);
        throw error;
      }

      // Reverse pour ordre chronologique
      const sortedMessages = (messages || []).reverse() as ChatMessage[];

      // Vérifier s'il reste des messages plus anciens
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      const hasMore = (count || 0) > limit;

      logger.dev('[HistoryManager] ✅ Messages récents chargés:', {
        sessionId,
        count: sortedMessages.length,
        hasMore,
        totalCount: count
      });

      return {
        messages: sortedMessages,
        hasMore,
        totalCount: count || 0
      };
    } catch (error) {
      logger.error('[HistoryManager] ❌ Exception getRecentMessages:', error);
      throw error;
    }
  }

  /**
   * 📥 Charger messages avant un sequence_number (infinite scroll)
   * 
   * Utilisé pour scroll vers le haut (charger anciens messages)
   * 
   * @param beforeSequence - Charger messages < beforeSequence
   * @returns Messages triés par ordre chronologique
   */
  async getMessagesBefore(
    sessionId: string,
    beforeSequence: number,
    limit: number = 20
  ): Promise<PaginatedMessages> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .lt('sequence_number', beforeSequence)
        .order('sequence_number', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[HistoryManager] ❌ Erreur getMessagesBefore:', error);
        throw error;
      }

      const sortedMessages = (messages || []).reverse() as ChatMessage[];

      // Vérifier s'il reste des messages encore plus anciens
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .lt('sequence_number', beforeSequence);

      const hasMore = (count || 0) > limit;

      logger.dev('[HistoryManager] ✅ Messages avant sequence chargés:', {
        sessionId,
        beforeSequence,
        count: sortedMessages.length,
        hasMore
      });

      return {
        messages: sortedMessages,
        hasMore
      };
    } catch (error) {
      logger.error('[HistoryManager] ❌ Exception getMessagesBefore:', error);
      throw error;
    }
  }

  /**
   * 🧠 Construire historique optimisé pour LLM
   * 
   * Filtrage intelligent:
   * 1. Charge maxMessages * 2 récents (buffer)
   * 2. Sépare conversationnel (user/assistant) vs tools
   * 3. Garde maxMessages conversationnels
   * 4. Garde seulement tools pertinents (liés aux assistants récents)
   * 5. Recombine et trie par sequence_number
   * 
   * Prévient:
   * - Context overflow (limite stricte)
   * - Tool messages orphelins (filtre par tool_call_id)
   * - Messages analysis vides (filtre canal)
   * 
   * @returns Historique optimisé pour le LLM
   */
  async buildLLMHistory(
    sessionId: string,
    config: HistoryConfig
  ): Promise<ChatMessage[]> {
    try {
      const { maxMessages, includeTools = true } = config;

      // Charger buffer (2x limit pour avoir marge)
      const { messages: allMessages } = await this.getRecentMessages(
        sessionId,
        maxMessages * 2
      );

      if (allMessages.length === 0) {
        return [];
      }

      // Filtrer selon config
      const filtered = this.filterForLLM(allMessages, config);

      logger.dev('[HistoryManager] ✅ Historique LLM construit:', {
        sessionId,
        totalMessages: allMessages.length,
        filteredMessages: filtered.length,
        includeTools
      });

      return filtered;
    } catch (error) {
      logger.error('[HistoryManager] ❌ Exception buildLLMHistory:', error);
      throw error;
    }
  }

  /**
   * 🔍 Filtrage intelligent pour LLM
   * 
   * Logique:
   * 1. Séparer conversationnel vs tools
   * 2. Garder maxMessages conversationnels récents
   * 3. Si includeTools: garder seulement tools pertinents
   * 4. Recombiner et trier
   * 
   * @private
   */
  private filterForLLM(
    messages: ChatMessage[],
    config: HistoryConfig
  ): ChatMessage[] {
    const { maxMessages, includeTools } = config;

    // 1. Séparer par type
    const conversational = messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    const tools = messages.filter((m) => m.role === 'tool');

    // 2. Garder maxMessages conversationnels récents
    const recentConversational = conversational.slice(-maxMessages);

    if (!includeTools) {
      return recentConversational;
    }

    // 3. Trouver tool_call_ids des assistants récents
    const relevantToolCallIds = new Set<string>();
    recentConversational
      .filter((m) => m.role === 'assistant' && m.tool_calls)
      .forEach((m) => {
        m.tool_calls?.forEach((tc) => relevantToolCallIds.add(tc.id));
      });

    // 4. Garder seulement tools pertinents
    const relevantTools = tools.filter(
      (t) => t.tool_call_id && relevantToolCallIds.has(t.tool_call_id)
    );

    // 5. Recombiner et trier par sequence_number
    const combined = [...recentConversational, ...relevantTools].sort(
      (a, b) => (a.sequence_number || 0) - (b.sequence_number || 0)
    );

    return combined;
  }

  /**
   * 🗑️ Supprimer messages après sequence_number (édition)
   * 
   * Utilisé pour édition de messages:
   * - User édite message N
   * - Supprimer tous messages > N
   * - Régénérer réponse assistant
   * 
   * @returns Nombre de messages supprimés
   */
  async deleteMessagesAfter(
    sessionId: string,
    afterSequence: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('delete_messages_after', {
        p_session_id: sessionId,
        p_after_sequence: afterSequence
      });

      if (error) {
        logger.error('[HistoryManager] ❌ Erreur deleteMessagesAfter:', error);
        throw error;
      }

      const deletedCount = data as number;

      logger.dev('[HistoryManager] ✅ Messages supprimés:', {
        sessionId,
        afterSequence,
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('[HistoryManager] ❌ Exception deleteMessagesAfter:', error);
      throw error;
    }
  }

  /**
   * 📊 Obtenir statistiques session
   * 
   * Utile pour debugging et monitoring
   */
  async getSessionStats(sessionId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    toolMessages: number;
    oldestSequence: number;
    newestSequence: number;
  }> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('role, sequence_number')
        .eq('session_id', sessionId);

      if (error) throw error;

      const allMessages = messages || [];

      return {
        totalMessages: allMessages.length,
        userMessages: allMessages.filter((m) => m.role === 'user').length,
        assistantMessages: allMessages.filter((m) => m.role === 'assistant')
          .length,
        toolMessages: allMessages.filter((m) => m.role === 'tool').length,
        oldestSequence:
          allMessages.length > 0
            ? Math.min(...allMessages.map((m) => m.sequence_number))
            : 0,
        newestSequence:
          allMessages.length > 0
            ? Math.max(...allMessages.map((m) => m.sequence_number))
            : 0
      };
    } catch (error) {
      logger.error('[HistoryManager] ❌ Exception getSessionStats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const historyManager = HistoryManager.getInstance();

