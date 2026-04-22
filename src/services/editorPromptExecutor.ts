/**
 * Service d'exécution des prompts éditeur avec agents
 * @module services/editorPromptExecutor
 */

import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { MentionedNotesFormatter } from '@/services/llm/MentionedNotesFormatter';

interface ExecutePromptResult {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Contexte enrichi pour l'exécution de prompts éditeur
 * Permet à l'AI d'avoir accès au contenu complet de la note
 */
interface EditorPromptContext {
  noteId: string;
  noteTitle: string;
  noteContent: string; // Contenu markdown complet
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
}

/**
 * Service pour exécuter les prompts éditeur avec les agents spécialisés
 */
export class EditorPromptExecutor {
  private static coerceResponseToText(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map(item => this.coerceResponseToText(item))
        .filter(Boolean)
        .join('\n');
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;

      if (typeof record.content === 'string') {
        return record.content;
      }
      if (typeof record.message === 'string') {
        return record.message;
      }
      if (typeof record.text === 'string') {
        return record.text;
      }

      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    if (value == null) {
      return '';
    }

    return String(value);
  }

  /**
   * Vérifie si un agent est disponible et actif
   */
  private static async isAgentAvailable(
    agentId: string,
    userToken?: string
  ): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      // Pré-check opportuniste: ajouter le bearer uniquement s'il ressemble à un JWT.
      // Si on reçoit un UUID/userId, on évite d'envoyer un header invalide.
      if (userToken && userToken.includes('.')) {
        headers.Authorization = `Bearer ${userToken}`;
      }

      const response = await fetch(`/api/ui/agents?specialized=false`, { headers });
      if (!response.ok) {
        // Ne pas bloquer l'exécution sur un pré-check non critique (401/403/offline).
        logger.warn('[EditorPromptExecutor] ⚠️ Pré-check agent indisponible, poursuite exécution', {
          status: response.status,
          agentId
        });
        return true;
      }

      const data = await response.json();
      const agent = data.agents?.find((a: Agent) => a.id === agentId);

      return agent && agent.is_active;
    } catch (error) {
      // Pré-check best-effort : en cas d'erreur réseau, on laisse l'API d'exécution décider.
      logger.warn('[EditorPromptExecutor] ⚠️ Erreur vérification agent, poursuite exécution', error);
      return true;
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

      const isAvailable = await this.isAgentAvailable(prompt.agent_id, userIdOrToken);
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

      // 3. Générer un sessionId temporaire pour cette exécution (UUID valide requis par validation)
      const tempSessionId = crypto.randomUUID();

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

      // Injecter les mentions si présentes (notes référencées dans le template)
      if (prompt.mentions?.length) {
        const formatter = MentionedNotesFormatter.getInstance();
        const mentionsContext = formatter.buildContextMessage(prompt.mentions);
        if (mentionsContext) {
          requestPayload.message = mentionsContext + '\n\n' + requestPayload.message;
          // N'injecter mentionedNotes que si le contexte textuel est effectivement présent
          requestPayload.context.mentionedNotes = prompt.mentions;
        }
        logger.dev('[EditorPromptExecutor] 📌 Mentions injectées dans payload:', {
          count: prompt.mentions.length,
          hasContext: !!mentionsContext,
        });
      }

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
        let errorMessage = `Erreur HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // La réponse d'erreur n'est pas du JSON (ex : HTML Nginx, timeout) — on garde le message HTTP
        }
        logger.error('[EditorPromptExecutor] ❌ Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        return {
          success: false,
          error: `${errorMessage} (${response.status})`,
        };
      }

      const data = await response.json();

      logger.info('[EditorPromptExecutor] ✅ Réponse API reçue:', {
        hasResponse: !!data.response,
        hasMessage: !!data.message,
        dataKeys: Object.keys(data)
      });

      const rawResponse = data.response ?? data.message ?? data.content ?? '';
      let responseText = this.coerceResponseToText(rawResponse);
      
      // 🔧 NOUVEAU: Parser la réponse structurée si nécessaire
      if (prompt.use_structured_output && responseText) {
        try {
          // Essayer de parser la réponse JSON
          const parsed = JSON.parse(responseText);
          
          if (parsed && typeof parsed.content === 'string') {
            responseText = parsed.content;
            logger.info('[EditorPromptExecutor] 📋 Structured output parsé avec succès');
          } else if (parsed) {
            responseText = this.coerceResponseToText(parsed);
            logger.warn('[EditorPromptExecutor] ⚠️ Structured output sans content string, normalisation du payload');
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
   * @param noteContext - Contexte enrichi de la note (optionnel, pour meilleure AI)
   * @returns Résultat final
   */
  static async executePromptStream(
    prompt: EditorPrompt,
    selectedText: string,
    userToken: string,
    onChunk: (chunk: string) => void,
    noteContext?: EditorPromptContext
  ): Promise<ExecutePromptResult> {
    try {
      logger.info('[EditorPromptExecutor] 🌊 Exécution prompt en streaming:', prompt.name);

      // Vérifications identiques
      if (!prompt.agent_id) {
        return { success: false, error: 'Aucun agent assigné à ce prompt' };
      }

      const isAvailable = await this.isAgentAvailable(prompt.agent_id, userToken);
      if (!isAvailable) {
        return { success: false, error: 'Agent non disponible ou inactif' };
      }

      let finalPrompt = this.replaceSelection(prompt.prompt_template, selectedText);
      
      // ✅ FIX: Si le template ne contient pas {selection}, ajouter le texte à la fin
      if (!prompt.prompt_template.includes('{selection}')) {
        logger.dev('[EditorPromptExecutor] ⚠️ Template sans {selection}, ajout du texte à la fin');
        finalPrompt = `${prompt.prompt_template}\n\nTexte à traiter :\n${selectedText}`;
      }

      // Générer un sessionId temporaire pour cette exécution (UUID valide requis par validation)
      const tempSessionId = crypto.randomUUID();

      // ✅ NOUVEAU : Construire attachedNotes si contexte fourni (comme dans le chat)
      const attachedNotes = noteContext ? [{
        id: noteContext.noteId,
        title: noteContext.noteTitle,
        markdown_content: noteContext.noteContent,
        slug: noteContext.noteSlug,
        classeur_id: noteContext.classeurId
      }] : undefined;

      // ✅ NOUVEAU : Construire UI context enrichi
      const uiContext = noteContext ? {
        page: { type: 'editor', action: 'ask_ai' },
        active: {
          note: {
            title: noteContext.noteTitle,
            id: noteContext.noteId
          },
          ...(noteContext.classeurName && {
            classeur: {
              name: noteContext.classeurName,
              id: noteContext.classeurId
            }
          })
        }
      } : undefined;

      logger.dev('[EditorPromptExecutor] 📎 Contexte enrichi:', {
        hasNoteContext: !!noteContext,
        hasAttachedNotes: !!attachedNotes,
        noteTitle: noteContext?.noteTitle,
        contentLength: noteContext?.noteContent?.length
      });

      // Injecter les mentions dans le message si présentes
      let streamMessage = finalPrompt;
      let mentionedNotesContext: typeof prompt.mentions | undefined;
      if (prompt.mentions?.length) {
        const formatter = MentionedNotesFormatter.getInstance();
        const mentionsContext = formatter.buildContextMessage(prompt.mentions);
        if (mentionsContext) {
          streamMessage = mentionsContext + '\n\n' + finalPrompt;
          mentionedNotesContext = prompt.mentions;
          logger.dev('[EditorPromptExecutor] 📌 Mentions injectées (stream):', {
            count: prompt.mentions.length,
          });
        }
      }

      // ✅ FIX: Utiliser la route /stream pour le streaming SSE
      const response = await fetch('/api/chat/llm/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          message: streamMessage,
          context: {
            type: 'editor_prompt',
            sessionId: tempSessionId,
            agentId: prompt.agent_id,
            promptId: prompt.id,
            promptName: prompt.name,
            selectedText: selectedText.substring(0, 200),
            attachedNotes,
            uiContext,
            ...(mentionedNotesContext ? { mentionedNotes: mentionedNotesContext } : {}),
          },
          history: [],
        })
      });

      if (!response.ok) {
        let errorMsg = `Erreur HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {
          // Réponse non-JSON (HTML Nginx, timeout, etc.)
        }
        return { success: false, error: errorMsg };
      }

      // ✅ Parser le stream SSE avec StreamParser
      const { StreamParser } = await import('@/services/streaming/StreamParser');
      const parser = new StreamParser();
      
      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: 'Stream non disponible' };
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Parser les chunks SSE
        const chunks = parser.parseChunk(value);
        
        for (const chunk of chunks) {
          if (chunk.type === 'delta' && chunk.content) {
            // Accumuler et envoyer au callback
            fullResponse += chunk.content;
            onChunk(chunk.content);
          } else if (chunk.type === 'error') {
            logger.error('[EditorPromptExecutor] ❌ Erreur streaming:', chunk.error);
            return {
              success: false,
              error: chunk.error || 'Erreur inconnue'
            };
          }
        }
      }

      logger.info('[EditorPromptExecutor] ✅ Streaming terminé:', {
        totalLength: fullResponse.length
      });

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

