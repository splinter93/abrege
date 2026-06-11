import { streamLifecycleService } from '@/services/chat/StreamLifecycleService';
import type { StreamCancelReason } from '@/types/streamRun';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Cooperative abort for the LLM stream loop (client disconnect + DB cancel).
 */
export class StreamLoopController {
  private localAborted = false;
  private disconnectHandled = false;

  constructor(
    private readonly request: Request,
    private readonly assistantOperationId: string,
    private readonly onClientDisconnect: () => Promise<void>
  ) {
    if (request.signal.aborted) {
      this.localAborted = true;
    }

    request.signal.addEventListener('abort', () => {
      this.localAborted = true;
      if (!this.disconnectHandled) {
        this.disconnectHandled = true;
        void this.onClientDisconnect().catch((err) => {
          logger.warn('[StreamLoopController] client disconnect handler failed', {
            assistantOperationId: this.assistantOperationId,
            error: err instanceof Error ? err.message : String(err)
          });
        });
      }
    });
  }

  get aborted(): boolean {
    return this.localAborted || this.request.signal.aborted;
  }

  async shouldContinue(): Promise<boolean> {
    if (this.aborted) {
      return false;
    }
    return streamLifecycleService.isActive(this.assistantOperationId);
  }
}

export async function handleClientDisconnect(
  assistantOperationId: string,
  reason: StreamCancelReason = 'client_disconnect'
): Promise<void> {
  await streamLifecycleService.cancelRun({ assistantOperationId, reason });
}
