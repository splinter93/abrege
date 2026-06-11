import type { StreamTimeline } from '@/types/streamTimeline';
import type { StreamCancelReason } from '@/types/streamRun';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

export interface ActiveStreamContext {
  sessionId: string;
  userOperationId: string;
  assistantOperationId: string;
}

let activeStream: ActiveStreamContext | null = null;
const cancelledAssistantOperationIds = new Set<string>();

export function setActiveStream(ctx: ActiveStreamContext | null): void {
  activeStream = ctx;
}

export function getActiveStream(): ActiveStreamContext | null {
  return activeStream;
}

export function clearActiveStream(): void {
  activeStream = null;
}

export function markAssistantOperationCancelled(assistantOperationId: string): void {
  cancelledAssistantOperationIds.add(assistantOperationId);
}

export function isAssistantOperationCancelled(assistantOperationId: string): boolean {
  return cancelledAssistantOperationIds.has(assistantOperationId);
}

export interface CancelStreamOnServerParams {
  sessionId: string;
  assistantOperationId: string;
  userOperationId?: string;
  reason: StreamCancelReason;
  partial?: {
    content: string;
    reasoning?: string;
    streamTimeline?: StreamTimeline;
  };
  token: string;
}

export interface CancelStreamResult {
  success: boolean;
  message?: ChatMessage;
  messageId?: string;
}

/**
 * Best-effort server cancel — marks operation cancelled locally even on network failure.
 */
export async function cancelStreamOnServer(
  params: CancelStreamOnServerParams
): Promise<CancelStreamResult> {
  const { sessionId, assistantOperationId, userOperationId, reason, partial, token } = params;

  const markCancelled = () => markAssistantOperationCancelled(assistantOperationId);

  try {
    const response = await fetch(`/api/chat/sessions/${sessionId}/streams/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        assistantOperationId,
        ...(userOperationId ? { userOperationId } : {}),
        reason,
        ...(partial
          ? {
              partial: {
                content: partial.content,
                ...(partial.reasoning ? { reasoning: partial.reasoning } : {}),
                ...(partial.streamTimeline ? { streamTimeline: partial.streamTimeline } : {})
              }
            }
          : {})
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      logger.warn('[useStreamCancellation] cancel API non-OK', {
        status: response.status,
        assistantOperationId,
        errText: errText.slice(0, 200)
      });
      markCancelled();
      return { success: false };
    }

    const data = (await response.json()) as {
      success?: boolean;
      message?: ChatMessage;
      messageId?: string;
    };

    markCancelled();
    clearActiveStream();

    return {
      success: data.success ?? true,
      message: data.message,
      messageId: data.messageId
    };
  } catch (err) {
    logger.warn('[useStreamCancellation] cancel API failed (network)', {
      assistantOperationId,
      error: err instanceof Error ? err.message : String(err)
    });
    markCancelled();
    return { success: false };
  }
}
