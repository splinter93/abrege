/**
 * Validation du fichier PDF côté client (type, taille max).
 * Règles : PDF uniquement, max 50 Mo.
 */

export const MAX_PDF_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export interface ValidatePdfFileResult {
  valid: boolean;
  error?: string;
}

export function validatePdfFile(file: File): ValidatePdfFileResult {
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return { valid: false, error: 'Seuls les fichiers PDF sont acceptés' };
  }
  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    const maxMB = MAX_PDF_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `Fichier trop volumineux (max ${maxMB} Mo)`,
    };
  }
  return { valid: true };
}
