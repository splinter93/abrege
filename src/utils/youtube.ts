/**
 * Utilitaires pour gérer les URLs et IDs YouTube
 *
 * Standards:
 * - Supporter les formats d'URL courants (youtube.com, youtu.be, /embed, /shorts)
 * - Toujours retourner un ID 11 caractères (A-Za-z0-9_-)
 * - Ne jamais lancer d'exception en cas d'entrée invalide
 */

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const TIMESTAMP_REGEX = /^(?:([0-9]+)h)?(?:([0-9]+)m)?(?:([0-9]+)s)?$/i;

export interface ParsedYouTubeInput {
  videoId: string | null;
  startSeconds: number | null;
}

function parseTimestampValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  const match = trimmed.match(TIMESTAMP_REGEX);
  if (!match) {
    return null;
  }

  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeStartSeconds(value: number | null): number | null {
  if (value == null || Number.isNaN(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

export function parseYouTubeTimestamp(value: string | null | undefined): number | null {
  return normalizeStartSeconds(parseTimestampValue(value));
}

export function parseYouTubeInput(input: string | null | undefined): ParsedYouTubeInput {
  if (!input) {
    return { videoId: null, startSeconds: null };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { videoId: null, startSeconds: null };
  }

  if (YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    return { videoId: trimmed, startSeconds: null };
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const candidate = pathSegments[0];
      if (candidate && YOUTUBE_VIDEO_ID_REGEX.test(candidate)) {
        videoId = candidate;
      }
    }

    if (!videoId && hostname.endsWith('youtube.com')) {
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const fromQuery = url.searchParams.get('v');
      if (fromQuery && YOUTUBE_VIDEO_ID_REGEX.test(fromQuery)) {
        videoId = fromQuery;
      }

      if (!videoId) {
        const embedIndex = pathSegments.indexOf('embed');
        if (embedIndex !== -1 && pathSegments[embedIndex + 1]) {
          const candidate = pathSegments[embedIndex + 1];
          if (YOUTUBE_VIDEO_ID_REGEX.test(candidate)) {
            videoId = candidate;
          }
        }
      }

      if (!videoId) {
        const shortsIndex = pathSegments.indexOf('shorts');
        if (shortsIndex !== -1 && pathSegments[shortsIndex + 1]) {
          const candidate = pathSegments[shortsIndex + 1];
          if (YOUTUBE_VIDEO_ID_REGEX.test(candidate)) {
            videoId = candidate;
          }
        }
      }
    }

    const startCandidates = [
      url.searchParams.get('t'),
      url.searchParams.get('start'),
      url.hash.startsWith('#t=') ? url.hash.slice(3) : null,
      url.hash.startsWith('t=') ? url.hash.slice(2) : null,
    ];

    const startSeconds = normalizeStartSeconds(
      startCandidates.reduce<number | null>((acc, candidate) => {
        if (acc != null) {
          return acc;
        }
        return parseTimestampValue(candidate ?? undefined);
      }, null)
    );

    return { videoId, startSeconds };
  } catch (error) {
    return { videoId: null, startSeconds: null };
  }
}

/**
 * Extrait l'identifiant de vidéo YouTube depuis un ID ou une URL
 * @param input Chaîne fournie par l'utilisateur (ID ou URL)
 * @returns ID valide (11 caractères) ou null si invalide
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  return parseYouTubeInput(input).videoId;
}

export function extractYouTubeStartSeconds(input: string | null | undefined): number | null {
  return parseYouTubeInput(input).startSeconds;
}

export interface YouTubeEmbedUrlOptions {
  autoplay?: boolean;
  mute?: boolean;
  startSeconds?: number;
  endSeconds?: number;
  loop?: boolean;
  playlistId?: string;
}

/**
 * Construit l'URL d'iframe embed sécurisée pour YouTube
 * @param videoId ID de la vidéo (doit être validé en amont)
 * @param options Options d'affichage (autoplay, loop, etc.)
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: YouTubeEmbedUrlOptions = {}
): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });

  if (options.autoplay) {
    params.set('autoplay', '1');
  }
  if (options.mute) {
    params.set('mute', '1');
  }
  if (typeof options.startSeconds === 'number' && options.startSeconds >= 0) {
    params.set('start', Math.floor(options.startSeconds).toString());
  }
  if (typeof options.endSeconds === 'number' && options.endSeconds > 0) {
    params.set('end', Math.floor(options.endSeconds).toString());
  }
  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', options.playlistId ?? videoId);
  } else if (options.playlistId) {
    params.set('playlist', options.playlistId);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Vérifie si une chaîne correspond à un ID YouTube valide
 */
export function isValidYouTubeVideoId(candidate: string | null | undefined): boolean {
  if (!candidate) {
    return false;
  }

  return YOUTUBE_VIDEO_ID_REGEX.test(candidate.trim());
}


