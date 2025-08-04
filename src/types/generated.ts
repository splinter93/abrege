
// Types génériques pour remplacer 'any'
export type ApiResponse<T = unknown> = {
  data: T;
  error?: string;
  status: number;
};

export type SupabaseQueryResult<T = unknown> = {
  data: T[] | null;
  error: unknown;
  count: number | null;
};

export type EventPayload = {
  type: string;
  payload: unknown;
  timestamp: number;
};

export type RealtimeEvent = {
  event: string;
  payload: unknown;
  timestamp: number;
};

export type ErrorHandler = (error: unknown) => void;

export type ConfigObject = Record<string, unknown>;

export type EventHandler = (event: unknown) => void;
