import type { LLMProvider, AppContext, ChatMessage } from '../types';
import { logger, LogCategory } from '@/utils/logger';

export class SynesiaProvider implements LLMProvider {
  name = 'Synesia';
  id = 'synesia';
  
  private apiKey: string;
  private projectId: string;
  private callableId = 'a62f3fb5-17ee-488c-b775-b57fc89c617e';

  constructor() {
    this.apiKey = process.env.SYNESIA_API_KEY || '';
    this.projectId = process.env.SYNESIA_PROJECT_ID || '';
  }

  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Synesia API configuration missing');
    }

    try {
      // Préparer l'historique des messages (max 10)
      const recentMessages = history.slice(-10);
      const messageHistory = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Ajouter le nouveau message avec contexte injecté
      const messageWithContext = this.injectContext(message, context);

      const payload = {
        callable_id: this.callableId,
        args: messageWithContext,
        settings: {
          history_messages: messageHistory
        }
      };

      logger.debug(LogCategory.API, '[Synesia Provider] 📤 Payload envoyé:', payload);

      const response = await fetch('https://api.synesia.app/execution?wait=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiKey}`,
          'X-Project-ID': this.projectId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Synesia API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.debug(LogCategory.API, '[Synesia Provider] ✅ Réponse reçue:', data);

      return data.result || data.response || 'Désolé, je n\'ai pas pu traiter votre demande.';

    } catch (error) {
      logger.error(LogCategory.API, '[Synesia Provider] ❌ Erreur:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!(this.apiKey && this.projectId);
  }

  private injectContext(message: string, context: AppContext): string {
    return `Tu es dans l'application Abrège. 

Contexte actuel :
- Type: ${context.type}
- Nom: ${context.name}
- ID: ${context.id}
${context.content ? `- Contenu: ${context.content.substring(0, 500)}...` : ''}

Message utilisateur : ${message}`;
  }
} 