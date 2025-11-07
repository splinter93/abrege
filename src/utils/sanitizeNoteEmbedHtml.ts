const NOTE_EMBED_REGEX = /<note-embed\b([^>]*)>(.*?)<\/note-embed>/gis;

function extractNoteRef(attrs: string): string | null {
  const match = attrs.match(/data-note-ref\s*=\s*"([^"]*)"/i) || attrs.match(/data-note-ref\s*=\s*'([^']*)'/i);
  if (!match) {
    return null;
  }
  const value = (match[1] ?? '').trim();
  return value.length > 0 ? value : null;
}

export function sanitizeNoteEmbedHtml(html: string): string {
  if (typeof html !== 'string' || html.length === 0) {
    return html;
  }

  return html.replace(NOTE_EMBED_REGEX, (fullMatch, attrs) => {
    const noteRef = extractNoteRef(attrs);
    if (noteRef) {
      return fullMatch;
    }

    // Remplacer les embeds invalides par un paragraphe vide pour préserver la structure
    return '<p></p>';
  });
}

export default sanitizeNoteEmbedHtml;

