import { streamLifecycleService } from '@/services/chat/StreamLifecycleService';
import { LogCategory, logger } from '@/utils/logger';

export interface PersistAssistantParams {
  sessionId: string;
  userId: string;
  userOperationId: string | null;
  assistantOperationId: string;
  textContent: string;
  reasoning?: string;
}

export interface PersistAssistantResult {
  persisted: boolean;
  messageId?: string;
  skipReason?: string;
}

/**
 * Persists the final assistant message when stream lifecycle + conversation guards allow it.
 */
export async function persistAssistantIfAllowed(
  params: PersistAssistantParams
): Promise<PersistAssistantResult> {
  const {
    sessionId,
    userId,
    userOperationId,
    assistantOperationId,
    textContent,
    reasoning
  } = params;

  if (!textContent.trim()) {
    return { persisted: false, skipReason: 'empty_content' };
  }

  const guard = await streamLifecycleService.assertCanPersistAssistant({
    sessionId,
    userId,
    userOperationId,
    assistantOperationId
  });

  if (!guard.allowed) {
    logger.warn(LogCategory.API, '[StreamPersistCoordinator] persist skipped', {
      sessionId,
      userOperationId,
      assistantOperationId,
      reason: guard.reason
    });
    return { persisted: false, skipReason: guard.reason };
  }

  const { historyManager } = await import('@/services/chat/HistoryManager');
  const saved = await historyManager.addMessage(sessionId, {
    role: 'assistant',
    content: textContent,
    ...(reasoning ? { reasoning } : {}),
    operation_id: assistantOperationId
  });

  await streamLifecycleService.completeRun(assistantOperationId);

  return {
    persisted: true,
    messageId: saved.id
  };
}
