/**
 * Déclenche le téléchargement d’un fichier texte côté client (navigateur uniquement).
 *
 * @throws Error si appelé hors navigateur (pas de document.body).
 */

export function downloadTextFile(
  content: string,
  mimeType: string,
  filename: string
): void {
  if (typeof document === 'undefined' || document.body === null) {
    throw new Error('downloadTextFile requires a browser environment');
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
