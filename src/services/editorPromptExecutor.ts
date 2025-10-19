/**
 * Service d'exécution des prompts éditeur avec agents
 * @module services/editorPromptExecutor
 */

import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

interface ExecutePromptResult {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Service pour exécuter les prompts éditeur avec les agents spécialisés
 */
export class EditorPromptExecutor {
  /**
   * Vérifie si un agent est disponible et actif
   */
  private static async isAgentAvailable(agentId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/ui/agents?specialized=false`);
      if (!response.ok) return false;

      const data = await response.json();
      const agent = data.agents?.find((a: Agent) => a.id === agentId);

      return agent && agent.is_active;
    } catch (error) {
      logger.error('[EditorPromptExecutor] ❌ Erreur vérification agent:', error);
      return false;
    }
  }

  /**
   * Remplace le placeholder {selection} dans le template
   */
  private static replaceSelection(template: string, selectedText: string): string {
    // Remplacer toutes les occurrences de {selection}
    const result = template.replace(/{selection}/g, selectedText);
    
    logger.dev('[EditorPromptExecutor] 🔄 Remplacement {selection}:', {
      templateLength: template.length,
      hasPlaceholder: template.includes('{selection}'),
      selectedTextLength: selectedText.length,
      resultLength: result.length
    });
    
    return result;
  }

  /**
   * Exécute un prompt éditeur avec l'agent associé
   * @param prompt - Prompt à exécuter
   * @param selectedText - Texte sélectionné dans l'éditeur
   * @param userIdOrToken - ID de l'utilisateur (UUID) ou token JWT
   * @returns Résultat de l'exécution
   */
  static async executePrompt(
    prompt: EditorPrompt,
    selectedText: string,
    userIdOrToken: string
  ): Promise<ExecutePromptResult> {
    try {
      logger.info('[EditorPromptExecutor] 🚀 Exécution prompt:', {
        promptName: prompt.name,
        agentId: prompt.agent_id,
        selectionLength: selectedText.length
      });

      // 1. Vérifier que l'agent existe et est actif
      if (!prompt.agent_id) {
        return {
          success: false,
          error: 'Aucun agent assigné à ce prompt'
        };
      }

      const isAvailable = await this.isAgentAvailable(prompt.agent_id);
      if (!isAvailable) {
        return {
          success: false,
          error: 'Agent non disponible ou inactif'
        };
      }

      // 2. Remplacer {selection} dans le template
      let finalPrompt = this.replaceSelection(prompt.prompt_template, selectedText);
      
      // ✅ FIX: Si le template ne contient pas {selection}, ajouter le texte à la fin
      if (!prompt.prompt_template.includes('{selection}')) {
        logger.dev('[EditorPromptExecutor] ⚠️ Template sans {selection}, ajout du texte à la fin');
        finalPrompt = `${prompt.prompt_template}\n\nTexte à traiter :\n${selectedText}`;
      }

      logger.dev('[EditorPromptExecutor] 📝 Prompt final:', finalPrompt);

      // 3. Générer un sessionId temporaire pour cette exécution
      const tempSessionId = `prompt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 4. Préparer le payload de la requête
      const requestPayload: any = {
        message: finalPrompt,
        context: {
          type: 'editor_prompt',
          sessionId: tempSessionId, // ✅ FIX: Ajouter le sessionId requis
          agentId: prompt.agent_id,
          promptId: prompt.id,
          promptName: prompt.name,
          selectedText: selectedText.substring(0, 200) // Aperçu du texte sélectionné
        },
        history: [],
        provider: 'groq'
      };

      // 🔧 NOUVEAU: Ajouter structured outputs si configuré
      if (prompt.use_structured_output && prompt.output_schema) {
        requestPayload.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'editor_prompt_response',
            strict: true,
            schema: prompt.output_schema
          }
        };
        
        // Ajouter instruction explicite dans le prompt
        requestPayload.message += '\n\nIMPORTANT: Return ONLY the requested content in the "content" field of the JSON response. NO introduction, NO explanation, NO extra phrases.';
        
        logger.dev('[EditorPromptExecutor] 📋 Structured output activé:', {
          schema: prompt.output_schema
        });
      }

      // 5. Appeler l'API LLM avec l'agent spécifique
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userIdOrToken}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Erreur lors de l\'appel à l\'API';
        logger.error('[EditorPromptExecutor] ❌ Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          fullError: errorData
        });
        return {
          success: false,
          error: `${errorMessage} (${response.status})`
        };
      }

      const data = await response.json();

      logger.info('[EditorPromptExecutor] ✅ Réponse API reçue:', {
        hasResponse: !!data.response,
        hasMessage: !!data.message,
        dataKeys: Object.keys(data)
      });

      let responseText = data.response || data.message || data.content || '';
      
      // 🔧 NOUVEAU: Parser la réponse structurée si nécessaire
      if (prompt.use_structured_output && responseText) {
        try {
          // Essayer de parser la réponse JSON
          const parsed = JSON.parse(responseText);
          
          if (parsed && typeof parsed.content === 'string') {
            responseText = parsed.content;
            logger.info('[EditorPromptExecutor] 📋 Structured output parsé avec succès');
          } else {
            logger.warn('[EditorPromptExecutor] ⚠️ Structured output invalide, utilisation du texte brut');
          }
        } catch (parseError) {
          // Si le parsing échoue, utiliser le texte brut
          logger.warn('[EditorPromptExecutor] ⚠️ Échec parsing JSON, utilisation du texte brut:', parseError);
        }
      }
      
      if (!responseText) {
        logger.warn('[EditorPromptExecutor] ⚠️ Aucun texte dans la réponse:', data);
        return {
          success: false,
          error: 'Réponse vide de l\'API'
        };
      }

      return {
        success: true,
        response: responseText
      };

    } catch (error) {
      logger.error('[EditorPromptExecutor] ❌ Erreur exécution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Exécute un prompt en mode streaming (pour affichage en temps réel)
   * @param prompt - Prompt à exécuter
   * @param selectedText - Texte sélectionné
   * @param userToken - Token utilisateur
   * @param onChunk - Callback appelé pour chaque chunk reçu
   * @returns Résultat final
   */
  static async executePromptStream(
    prompt: EditorPrompt,
    selectedText: string,
    userToken: string,
    onChunk: (chunk: string) => void
  ): Promise<ExecutePromptResult> {
    try {
      logger.info('[EditorPromptExecutor] 🌊 Exécution prompt en streaming:', prompt.name);

      // Vérifications identiques
      if (!prompt.agent_id) {
        return { success: false, error: 'Aucun agent assigné à ce prompt' };
      }

      const isAvailable = await this.isAgentAvailable(prompt.agent_id);
      if (!isAvailable) {
        return { success: false, error: 'Agent non disponible ou inactif' };
      }

      const finalPrompt = this.replaceSelection(prompt.prompt_template, selectedText);

      // Appel en mode streaming
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          message: finalPrompt,
          context: {
            type: 'editor_prompt',
            agentId: prompt.agent_id,
            promptId: prompt.id,
            promptName: prompt.name,
            selectedText: selectedText.substring(0, 200)
          },
          history: [],
          provider: 'groq',
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Erreur lors de l\'appel à l\'API'
        };
      }

      // Lire le stream
      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: 'Stream non disponible' };
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        onChunk(chunk);
      }

      logger.info('[EditorPromptExecutor] ✅ Streaming terminé');

      return {
        success: true,
        response: fullResponse
      };

    } catch (error) {
      logger.error('[EditorPromptExecutor] ❌ Erreur streaming:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

