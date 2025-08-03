import type { LLMProvider, AppContext, ChatMessage } from '../types';

export class DeepSeekProvider implements LLMProvider {
  name = 'DeepSeek';
  id = 'deepseek';
  
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('DeepSeek API key not configured');
    }

    try {
      // Préparer les messages selon la doc DeepSeek
      const messages = [
        {
          role: 'system' as const,
          content: this.formatContext(context)
        },
        ...history.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: message
        }
      ];

      const payload = {
        model: 'deepseek-chat', // DeepSeek-V3-0324 selon la doc
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 4000
      };

      console.log('[DeepSeek Provider] 📤 Payload:', payload);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[DeepSeek Provider] ✅ Réponse reçue:', data);

      // Format de réponse DeepSeek : data.choices[0].message.content
      return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.';

    } catch (error) {
      console.error('[DeepSeek Provider] ❌ Erreur:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private formatContext(context: AppContext): string {
    return `Tu es un assistant IA dans l'application Abrège. 
    
Contexte actuel :
- Type: ${context.type}
- Nom: ${context.name}
- ID: ${context.id}
${context.content ? `- Contenu: ${context.content.substring(0, 500)}...` : ''}

Réponds de manière utile et contextuelle en français.`;
  }
} 