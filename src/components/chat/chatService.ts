import { ChatLogger } from './chatLogger';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SynesiaResponse {
  response?: string;
  error?: string;
}

export async function getSynesiaResponse(message: string, messages: Message[] = []): Promise<SynesiaResponse> {
  try {
    const response = await fetch("/api/chat/synesia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message, // Ceci sera utilisé comme 'args'
        messages // Ceci sera utilisé pour 'history_messages'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return { response: data.response };
  } catch (error) {
    ChatLogger.error('API', error instanceof Error ? error : new Error(String(error)), {
      message,
      messageCount: messages.length
    });
    return { error: error instanceof Error ? error.message : "Une erreur inconnue s'est produite" };
  }
} 