/**
 * Types de qualité pour éliminer les types 'any'
 * Phase 2 : Qualité du Code
 */

// ========================================
// TYPES API GÉNÉRIQUES
// ========================================

export interface ApiResponse<T = unknown> {
  data: T;
  error?: string;
  status: number;
  message?: string;
}

export interface ApiError {
  error: string;
  status: number;
  details?: unknown;
}

export interface ApiContext {
  params: Promise<{ ref: string }>;
}

export interface ApiHandler<T = unknown> {
  (req: Request, context: ApiContext): Promise<Response>;
}

// ========================================
// TYPES SUPABASE
// ========================================

export interface SupabaseQueryResult<T = unknown> {
  data: T[] | null;
  error: unknown;
  count: number | null;
}

export interface SupabaseSingleResult<T = unknown> {
  data: T | null;
  error: unknown;
}

export interface SupabaseInsertResult<T = unknown> {
  data: T[] | null;
  error: unknown;
  count: number | null;
}

export interface SupabaseUpdateResult<T = unknown> {
  data: T[] | null;
  error: unknown;
  count: number | null;
}

// ========================================
// TYPES ÉVÉNEMENTS
// ========================================

export interface BaseEvent {
  type: string;
  timestamp: number;
  userId?: string;
}

export interface NoteEvent extends BaseEvent {
  type: 'note.created' | 'note.updated' | 'note.deleted';
  payload: {
    id: string;
    title?: string;
    content?: string;
    userId: string;
  };
}

export interface FolderEvent extends BaseEvent {
  type: 'folder.created' | 'folder.updated' | 'folder.deleted';
  payload: {
    id: string;
    name: string;
    parentId?: string;
    userId: string;
  };
}

export interface ClasseurEvent extends BaseEvent {
  type: 'classeur.created' | 'classeur.updated' | 'classeur.deleted';
  payload: {
    id: string;
    name: string;
    userId: string;
  };
}

export type AppEvent = NoteEvent | FolderEvent | ClasseurEvent;

// ========================================
// TYPES GÉNÉRIQUES
// ========================================

export type SafeRecord<K extends string, V> = Record<K, V>;

export type SafeUnknown = unknown;

export type SafeError = Error | { message: string; stack?: string };

export type SafeFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = (...args: TArgs) => TReturn;

export type SafeAsyncFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = (...args: TArgs) => Promise<TReturn>;

// ========================================
// TYPES VALIDATION
// ========================================

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface ValidationSchema<T = unknown> {
  validate: (data: unknown) => ValidationResult<T>;
  parse: (data: unknown) => T;
}

// ========================================
// TYPES PERFORMANCE
// ========================================

export interface MemoizationConfig {
  maxSize?: number;
  ttl?: number;
  equalityFn?: (a: unknown, b: unknown) => boolean;
}

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
}

// ========================================
// TYPES UTILITAIRES
// ========================================

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ========================================
// TYPE GUARDS
// ========================================

export function isApiResponse(obj: unknown): obj is ApiResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    'status' in obj
  );
}

export function isApiError(obj: unknown): obj is ApiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    'status' in obj
  );
}

export function isAppEvent(obj: unknown): obj is AppEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'timestamp' in obj
  );
}

export function isSafeError(obj: unknown): obj is SafeError {
  return (
    obj instanceof Error ||
    (typeof obj === 'object' &&
      obj !== null &&
      'message' in obj &&
      typeof (obj as { message: unknown }).message === 'string')
  );
}

// ========================================
// TYPES DE REMPLACEMENT DIRECT
// ========================================

// Remplacer : any → unknown
export type AnyReplacement = unknown;

// Remplacer : any[] → unknown[]
export type AnyArrayReplacement = unknown[];

// Remplacer : Record<string, any> → SafeRecord<string, unknown>
export type AnyRecordReplacement = SafeRecord<string, unknown>;

// Remplacer : (param: any) => void → (param: unknown) => void
export type AnyFunctionReplacement = SafeFunction<[unknown], void>;

// Remplacer : Promise<any> → Promise<unknown>
export type AnyPromiseReplacement = Promise<unknown>; 