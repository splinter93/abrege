/**
 * Retire les tags inline TTS xAI `[tag]` du texte pour l’affichage en bulle uniquement.
 * Liste blanche alignée sur docs/TTS_SPEECH_TAGS_GUIDE.md (ne pas élargir : risque de manger du markdown).
 *
 * Ne strippe pas à l’intérieur du code : blocs ``` … ``` puis code inline `…` (backticks simples,
 * une ligne). Le reste du markdown est encore brut à ce stade ; on protège donc ces segments avant la regex des tags.
 */
const TTS_INLINE_TAGS_PATTERN =
  /\[(?:pause|long-pause|hum-tune|laugh|chuckle|giggle|cry|tsk|tongue-click|lip-smack|breath|inhale|exhale|sigh)\]/g;

/** Blocs de code fenced (``` … ```), non greedy. */
const FENCED_CODE_BLOCK = /```[\s\S]*?```/g;

/** Code inline une ligne : ` … ` (pas les triple backticks, déjà retirés des blocs). */
const INLINE_CODE_ONE_LINE = /`[^`\n]*`/g;

const PLACEHOLDER = (i: number) => `\uE000${i}\uE001`;

function stripTagsOnly(text: string): string {
  return text
    .replace(TTS_INLINE_TAGS_PATTERN, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

export function stripTtsInlineTagsForDisplay(text: string | null | undefined): string {
  if (text == null || typeof text !== 'string') return '';

  const vault: string[] = [];
  let s = text.replace(FENCED_CODE_BLOCK, match => {
    vault.push(match);
    return PLACEHOLDER(vault.length - 1);
  });
  s = s.replace(INLINE_CODE_ONE_LINE, match => {
    vault.push(match);
    return PLACEHOLDER(vault.length - 1);
  });

  s = stripTagsOnly(s);

  for (let i = vault.length - 1; i >= 0; i--) {
    s = s.split(PLACEHOLDER(i)).join(vault[i]!);
  }
  return s;
}
