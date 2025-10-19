import { supabase } from '@/supabaseClient';
import { DEFAULT_VALUES, ERROR_MESSAGES } from '@/constants/fileUpload';

// ========================================
// TYPES ET INTERFACES
// ========================================

interface UploadPayload {
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface ExternalUrlPayload {
  externalUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface FileData {
  id: string;
  filename: string;
  url?: string;
  mime_type: string;
  size: number;
}

interface UploadResponse {
  file: FileData;
  uploadUrl?: string;
  expiresAt?: Date;
}

interface GetUrlResponse {
  success: boolean;
  url: string;
  file: FileData;
}

// ========================================
// CONSTANTES
// ========================================



// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Valide qu'une URL est valide
 */
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Construit le payload d'upload selon le type
 */
function buildUploadPayload(file: File | string): UploadPayload | ExternalUrlPayload {
  if (typeof file === 'object') {
    return {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  } else {
    // Pour une URL externe, on n'envoie que l'URL
    // Les autres champs seront gérés côté serveur
    return {
      externalUrl: file,
    };
  }
}

/**
 * Upload d'un fichier vers S3
 */
async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Erreur upload S3: ${response.status} ${response.statusText}`);
  }
}

/**
 * Récupère l'URL finale via l'endpoint dédié
 */
async function getFinalUrl(fileId: string, authHeader: Record<string, string>): Promise<string | null> {
  try {
    const response = await fetch('/api/ui/files/get-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ fileId }),
    });

    if (response.ok) {
      const data: GetUrlResponse = await response.json();
      return data.url;
    }
  } catch (error) {
    console.warn('Échec de l\'endpoint dédié, utilisation URL de la base:', error);
  }

  return null;
}

// ========================================
// FONCTION PRINCIPALE
// ========================================

/**
 * Upload d'image pour une note (fichier ou URL externe)
 * Utilise la même logique que FileUploaderLocal pour la cohérence
 */
export async function uploadImageForNote(
  file: File | string, 
  noteRef: string
): Promise<{ publicUrl: string; saved: FileData }> {
  // Authentification
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error(ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
  }

  const authHeader = { Authorization: `Bearer ${token}` } as const;
  const isFile = typeof file === 'object';

  // ========================================
  // ÉTAPE 1: Préparation de l'upload
  // ========================================
  
  const uploadPayload = buildUploadPayload(file);
  
  const uploadResponse = await fetch('/api/ui/files/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(uploadPayload),
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erreur lors de la préparation de l\'upload');
  }

  const uploadData: UploadResponse = await uploadResponse.json();
  const { file: savedFile, uploadUrl } = uploadData;

  // ========================================
  // ÉTAPE 2: Upload vers S3 (si fichier)
  // ========================================
  
  if (isFile && uploadUrl) {
    await uploadToS3(uploadUrl, file as File);
  }

  // ========================================
  // ÉTAPE 3: Récupération de l'URL finale
  // ========================================
  
  // Pour une URL externe, utiliser directement l'URL de la base
  if (!isFile) {
    const externalUrl = savedFile.url;
    if (!validateUrl(externalUrl)) {
      throw new Error(ERROR_MESSAGES.INVALID_URL);
    }
    return { publicUrl: externalUrl, saved: savedFile };
  }
  
  // Pour un fichier, essayer l'endpoint dédié d'abord
  const finalUrl = await getFinalUrl(savedFile.id, authHeader);
  
  if (finalUrl && validateUrl(finalUrl)) {
    return { publicUrl: finalUrl, saved: savedFile };
  }

  // Fallback vers l'URL de la base
  const fallbackUrl = savedFile.url;
  
  if (!validateUrl(fallbackUrl)) {
    throw new Error(ERROR_MESSAGES.INVALID_URL);
  }

  return { publicUrl: fallbackUrl, saved: savedFile };
} 