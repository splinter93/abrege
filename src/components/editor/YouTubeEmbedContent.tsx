import React, { useMemo } from 'react';
import { buildYouTubeEmbedUrl, isValidYouTubeVideoId } from '@/utils/youtube';
import '@/styles/youtube-embed.css';

interface YouTubeEmbedContentProps {
  videoId: string;
  autoplay?: boolean;
  startSeconds?: number | null;
  standalone?: boolean;
}

const YouTubeEmbedContent: React.FC<YouTubeEmbedContentProps> = ({
  videoId,
  autoplay = false,
  startSeconds = null,
  standalone = false,
}) => {
  const sanitizedVideoId = useMemo(() => (isValidYouTubeVideoId(videoId) ? videoId : null), [videoId]);

  const normalizedStartSeconds = useMemo(() => {
    if (typeof startSeconds === 'number' && startSeconds >= 0 && Number.isFinite(startSeconds)) {
      return Math.floor(startSeconds);
    }
    return null;
  }, [startSeconds]);

  const embedUrl = useMemo(() => {
    if (!sanitizedVideoId) {
      return null;
    }

    return buildYouTubeEmbedUrl(sanitizedVideoId, {
      autoplay,
      startSeconds: normalizedStartSeconds ?? undefined,
      mute: autoplay,
    });
  }, [sanitizedVideoId, autoplay, normalizedStartSeconds]);

  if (!sanitizedVideoId || !embedUrl) {
    return (
      <div className="youtube-embed youtube-embed__fallback">
        Impossible de charger la vidéo YouTube.
      </div>
    );
  }

  return (
    <div
      className={`youtube-embed ${standalone ? 'youtube-embed--standalone' : 'youtube-embed--editor'}`}
      data-video-id={sanitizedVideoId}
    >
      <div className="youtube-embed__player">
        <iframe
          className="youtube-embed__iframe"
          src={embedUrl}
          title="YouTube video player"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
};

export default React.memo(YouTubeEmbedContent);


