// ========================================
// TYPES POUR LA GESTION SÉCURISÉE DES FICHIERS
// ========================================

export interface FileItem {
  id: string;
  user_id: string;
  note_id?: string;
  folder_id?: string;
  filename: string;
  slug?: string;
  mime_type: string;
  size: number; // ✅ Correspond à la colonne 'size' de la DB
  url: string;
  preview_url?: string;
  extension?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  visibility?: 'private' | 'public' | 'targeted';
  s3_key: string;
  etag?: string;
  visibility_mode: 'inherit_note' | 'private' | 'public';
  owner_id: string;
  deleted_at?: string;
  status: FileStatus; // ✅ Colonne obligatoire
  sha256?: string;
  request_id?: string;
}

export type FileStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface FileUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  folderId?: string;
  notebookId?: string;
}

export interface FileUploadResponse {
  success: boolean;
  file: FileItem;
  uploadUrl: string;
  expiresAt: Date;
  requestId: string;
}

export interface FileDownloadResponse {
  success: boolean;
  downloadUrl: string;
  expiresAt: Date;
  etag?: string;
  requestId: string;
}

// ========================================
// TYPES POUR LES QUOTAS ET AUDIT
// ========================================

export interface StorageUsage {
  user_id: string;
  used_bytes: number;
  quota_bytes: number;
  updated_at: string;
}

export interface FileEvent {
  id: string;
  file_id: string;
  user_id: string;
  event_type: FileEventType;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type FileEventType = 
  | 'upload_initiated'
  | 'upload_completed'
  | 'download'
  | 'delete'
  | 'rename'
  | 'move'
  | 'share'
  | 'unshare';

// ========================================
// TYPES POUR LES SERVICES S3
// ========================================

export interface SecureUploadOptions {
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  folderId?: string;
  notebookId?: string;
  requestId: string;
}

export interface SecureUploadResult {
  uploadUrl: string;
  key: string;
  requestId: string;
  expiresAt: Date;
  sha256: string;
}

export interface SecureDownloadResult {
  downloadUrl: string;
  expiresAt: Date;
  etag?: string;
}

export interface QuotaCheckResult {
  canUpload: boolean;
  currentUsage: number;
  quota: number;
  remainingBytes: number;
}

// ========================================
// TYPES POUR LES HOOKS ET STORE
// ========================================

export interface FileManagerState {
  files: Record<string, FileItem>;
  loading: boolean;
  error: string | null;
  uploadProgress: Record<string, number>;
}

export interface FileManagerActions {
  // Actions de base
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, patch: Partial<FileItem>) => void;
  setFiles: (files: FileItem[]) => void;
  
  // Actions métier
  uploadFile: (file: File, options?: { folderId?: string; notebookId?: string }) => Promise<FileItem>;
  deleteFile: (id: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  moveFile: (id: string, folderId: string | null, notebookId?: string) => Promise<void>;
  
  // Actions de statut
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadProgress: (fileId: string) => void;
  
  // Actions d'erreur
  setError: (error: string | null) => void;
  clearError: () => void;
}

export interface UseFilesManagerResult extends FileManagerState, FileManagerActions {
  // Sélecteurs utiles
  filesByFolder: (folderId: string | null) => FileItem[];
  filesByNotebook: (notebookId: string) => FileItem[];
  totalSize: number;
  quotaInfo: QuotaCheckResult | null;
}

// ========================================
// TYPES POUR LES VALIDATIONS
// ========================================

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  checkQuota?: boolean;
  checkVirus?: boolean;
}

// ========================================
// TYPES POUR LES API RESPONSES
// ========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========================================
// TYPES POUR LES FILTRES ET RECHERCHE
// ========================================

export interface FileFilters {
  folderId?: string;
  notebookId?: string;
  mimeType?: string;
  status?: FileStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface FileSortOptions {
  field: 'filename' | 'size' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

// ========================================
// TYPES POUR LES PERMISSIONS (FUTUR)
// ========================================

export interface FilePermission {
  id: string;
  file_id: string;
  subject_id: string; // user_id ou group_id
  role: 'owner' | 'editor' | 'viewer';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

export type FilePermissionRole = 'owner' | 'editor' | 'viewer'; 