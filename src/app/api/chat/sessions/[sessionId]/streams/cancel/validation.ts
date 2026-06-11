import { z } from 'zod';
import { streamTimelineSchema } from '@/utils/chatValidationSchemas';

export const streamCancelReasonSchema = z.enum(['user_stop', 'superseded', 'client_disconnect']);

export const streamCancelBodySchema = z.object({
  assistantOperationId: z.string().uuid(),
  userOperationId: z.string().uuid().optional(),
  reason: streamCancelReasonSchema,
  partial: z
    .object({
      content: z.string(),
      reasoning: z.string().optional(),
      streamTimeline: streamTimelineSchema.optional()
    })
    .optional()
});

export type StreamCancelBody = z.infer<typeof streamCancelBodySchema>;
