import type { ChatMessage as FrontendChatMessage } from '@/types/chat';
import type { LLMChatMessage as BackendChatMessage } from '@/services/llm/types/agentTypes';
import type { MessageContent, MessageContentPart } from '@/types/image';

export function frontendToBackend(msg: FrontendChatMessage): BackendChatMessage {
  let content: string | null = null;
  
  if (typeof msg.content === 'string') {
    content = msg.content;
  } else if (Array.isArray(msg.content)) {
    const contentParts = msg.content as MessageContentPart[];
    const textPart = contentParts.find(
      (part): part is MessageContentPart & { type: 'text'; text: string } =>
        part.type === 'text' && typeof (part as { text?: unknown }).text === 'string'
    );
    content = textPart ? textPart.text : null;
  }

  const baseMessage: BackendChatMessage = {
    id: msg.id || `msg-${Date.now()}`,
    role: msg.role,
    content,
    timestamp: (msg.timestamp ?? new Date().toISOString()).toString()
  };

  if (msg.role === 'assistant') {
    const assistantMsg = msg as Extract<FrontendChatMessage, { role: 'assistant' }>;
    if (assistantMsg.tool_calls) {
      baseMessage.tool_calls = assistantMsg.tool_calls;
    }
    if (assistantMsg.channel) {
      baseMessage.channel = assistantMsg.channel;
    }
    if (assistantMsg.name) {
      baseMessage.name = assistantMsg.name;
    }
  }

  if (msg.role === 'tool') {
    const toolMsg = msg as Extract<FrontendChatMessage, { role: 'tool' }>;
    baseMessage.tool_call_id = toolMsg.tool_call_id;
    baseMessage.name = toolMsg.name;
  }

  return baseMessage;
}

export function frontendHistoryToBackend(history: FrontendChatMessage[]): BackendChatMessage[] {
  return history.map(frontendToBackend);
}

export function messageContentToString(content: string | MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  const textPart = content.find(part => part.type === 'text');
  return textPart && 'text' in textPart ? textPart.text : '';
}

export function isValidBackendMessage(msg: unknown): msg is BackendChatMessage {
  if (!msg || typeof msg !== 'object') return false;
  const candidate = msg as Partial<BackendChatMessage>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.role === 'string' &&
    ['system', 'user', 'assistant', 'tool'].includes(candidate.role) &&
    (candidate.content === null || typeof candidate.content === 'string') &&
    typeof candidate.timestamp === 'string'
  );
}
