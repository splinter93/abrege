/**
 * Strip markdown syntax for TTS input.
 * Keeps natural punctuation and readable text.
 * @param text - Raw content (markdown). Safe with null/undefined.
 */
export function stripMarkdownForTTS(text: string | null | undefined): string {
  if (text == null || typeof text !== 'string') return '';

  return (
    text
      // Code blocks (multiline)
      .replace(/```[\s\S]*?```/g, ' ')
      // Inline code
      .replace(/`([^`]+)`/g, '$1')
      // Bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Headers # ## ###
      .replace(/^#{1,6}\s+/gm, '')
      // Horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, ' ')
      // List markers
      .replace(/^\s*[-*+]\s+/gm, ' ')
      .replace(/^\s*\d+\.\s+/gm, ' ')
      // Blockquotes
      .replace(/^\s*>\s*/gm, ' ')
      // Extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}
