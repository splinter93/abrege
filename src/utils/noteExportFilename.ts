/**
 * Nom de fichier sûr pour les exports (évite chaîne vide si le titre n’a aucun caractère alphanumérique).
 */

export function noteExportFilename(title: string, extension: string): string {
  const trimmed = title.trim();
  const slug = trimmed
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  const base = slug.length > 0 ? slug : 'note';
  const ext = extension.replace(/^\./, '');
  return `${base}.${ext}`;
}
