import React, { useCallback } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import YouTubeEmbedContent from './YouTubeEmbedContent';
import { isValidYouTubeVideoId, parseYouTubeTimestamp } from '@/utils/youtube';
import '@/styles/youtube-embed.css';

const YouTubeEmbedViewComponent: React.FC<NodeViewProps> = ({ node, getPos }) => {
  const videoId = node.attrs.videoId as string | undefined;
  const autoplay = Boolean(node.attrs.autoplay);
  const startSecondsRaw = node.attrs.startSeconds;
  const startSeconds = typeof startSecondsRaw === 'number' && Number.isFinite(startSecondsRaw)
    ? startSecondsRaw
    : parseYouTubeTimestamp(typeof startSecondsRaw === 'string' ? startSecondsRaw : null) ?? null;

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const position = typeof getPos === 'function' ? getPos() : 0;

    const customEvent = new CustomEvent('tiptap-context-menu', {
      detail: {
        coords: { x: event.clientX, y: event.clientY },
        nodeType: 'youtubeEmbed',
        hasSelection: false,
        position,
      },
    });

    document.dispatchEvent(customEvent);
  }, [getPos]);

  if (!videoId || !isValidYouTubeVideoId(videoId)) {
    return (
      <NodeViewWrapper className="youtube-embed youtube-embed__fallback" contentEditable={false} draggable={false}>
        Vidéo YouTube invalide
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="youtube-embed-node"
      contentEditable={false}
      draggable={false}
      onContextMenu={handleContextMenu}
    >
      <YouTubeEmbedContent
        videoId={videoId}
        autoplay={autoplay}
        startSeconds={startSeconds}
        standalone={false}
      />
    </NodeViewWrapper>
  );
};

export default React.memo(YouTubeEmbedViewComponent);


