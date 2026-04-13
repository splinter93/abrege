/**
 * 🎧 useEditorStreamListener Hook
 *
 * Hook React pour écouter les streams d'une note dans l'éditeur classique
 * via Supabase Realtime Broadcast. Insère directement dans TipTap.
 *
 * Usage:
 * ```tsx
 * const editor = useEditor(...);
 * useEditorStreamListener(noteId, editor, { enabled: !readonly });
 * ```
 *
 * Le hook gère automatiquement :
 * - Abonnement Supabase Realtime
 * - Cleanup à l'unmount
 * - Insertion directe dans TipTap
 */

import { useEffect, useRef, useState } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import type { Editor } from '@tiptap/react';
import { supabase } from '@/supabaseClient';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { getEditorMarkdown } from '@/utils/editorHelpers';
import {
  prepareMarkdownForEditor,
  prepareStoredMarkdownForEditor,
} from '@/utils/markdownSanitizer.client';

interface UseEditorStreamListenerOptions {
  /**
   * Activer l'écoute du stream
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Position d'insertion dans l'éditeur
   * @default 'end'
   */
  defaultPosition?: 'end' | 'start' | 'cursor';
  
  /**
   * Callback appelé lors de la réception d'un chunk
   */
  onChunk?: (chunk: string) => void;
  
  /**
   * Callback appelé lors de la fin du stream
   */
  onEnd?: () => void;
  
  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: Error) => void;
  
  /**
   * Mode debug (logs détaillés)
   * @default false
   */
  debug?: boolean;
}

/**
 * Hook pour écouter un stream SSE d'une note et insérer dans l'éditeur
 * 
 * @param noteId - ID de la note à écouter (null = pas d'écoute)
 * @param editor - Instance TipTap editor (peut être null pendant l'init)
 * @param options - Options de configuration
 */
export function useEditorStreamListener(
  noteId: string | null | undefined,
  editor: Editor | null,
  options: UseEditorStreamListenerOptions = {}
) {
  const {
    enabled = true,
    defaultPosition = 'end',
    onChunk,
    onEnd,
    onError,
    debug = false
  } = options;

  // Logs de debug (seulement si debug=true)
  if (debug) {
    logger.debug(LogCategory.EDITOR, '[useEditorStreamListener] Hook appelé', {
      noteId,
      hasEditor: !!editor,
      enabled
    });
  }

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const isStreamingRef = useRef<boolean>(false);
  const streamBufferRef = useRef<string>('');
  const insertPositionRef = useRef<number>(0);

  const onChunkRef = useRef(onChunk);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onChunkRef.current = onChunk;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onChunk, onEnd, onError]);

  const getAuthTokenRef = useRef(async (): Promise<string | null> => {
    try {
      const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
      if (supabaseAuth) {
        const parsed = JSON.parse(supabaseAuth);
        if (parsed.access_token) return parsed.access_token;
      }
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      for (const key of keys) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.access_token) return data.access_token;
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Failed to get auth token', error);
    }
    return null;
  });

  useEffect(() => {
    if (!noteId || !editor || !enabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    logger.info(LogCategory.EDITOR, '[useEditorStreamListener] Subscribing to Supabase channel', { noteId });

    const channelName = `note-stream:${noteId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    const handleChunk = (p: { payload?: { data?: string; position?: string } }) => {
      const data = p?.payload?.data;
      if (!data || !editor) return;
      insertPositionRef.current = editor.state.selection.to;
      streamBufferRef.current += data;
      const position = (p.payload?.position as 'end' | 'start' | 'cursor') || defaultPosition;
      try {
        if (position === 'end') {
          editor.commands.insertContentAt(editor.state.doc.content.size, data);
        } else if (position === 'start') {
          editor.commands.insertContentAt(0, data);
        } else {
          editor.commands.insertContentAt(insertPositionRef.current, data);
          insertPositionRef.current += data.length;
        }
      } catch {
        editor.commands.insertContent(data);
      }
      onChunkRef.current?.(data);
    };

    const handleEnd = () => {
      setIsStreaming(false);
      isStreamingRef.current = false;
      streamBufferRef.current = '';
      onEndRef.current?.();
    };

    const handleContentUpdated = async (p: { payload?: { note_id?: string } }) => {
      const targetNoteId = p?.payload?.note_id || noteId;
      if (!targetNoteId || !editor) return;
      try {
        const token = await getAuthTokenRef.current();
        if (!token) return;
        const res = await fetch(`/api/v2/note/${targetNoteId}?fields=content`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (!result.success || result.note?.markdown_content === undefined) return;
        const newContentRaw = result.note.markdown_content || '';
        const currentContent = getEditorMarkdown(editor);
        // Même normalisation / dé-échappement des deux côtés (API peut renvoyer &lt;u&gt;… après sanitize serveur)
        if (prepareMarkdownForEditor(currentContent) === prepareMarkdownForEditor(newContentRaw)) return;
        if (editor.isFocused && !newContentRaw && !currentContent) return;
        const currentSelection = editor.state.selection;
        const wasFocused = editor.isFocused;
        editor.commands.setContent(prepareStoredMarkdownForEditor(newContentRaw), { emitUpdate: false });
        try {
          const docSize = editor.state.doc.content.size;
          editor.commands.setTextSelection(currentSelection.to <= docSize ? currentSelection : docSize);
          if (wasFocused) editor.commands.focus();
        } catch {
          /* restore failed */
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Failed to reload content', { noteId, error });
      }
    };

    channel
      .on('broadcast', { event: 'start' }, () => {
        setIsStreaming(true);
        isStreamingRef.current = true;
        streamBufferRef.current = '';
        insertPositionRef.current = editor.state.selection.to;
      })
      .on('broadcast', { event: 'chunk' }, handleChunk)
      .on('broadcast', { event: 'end' }, handleEnd)
      .on('broadcast', { event: 'content_updated' }, handleContentUpdated)
      .on('broadcast', { event: 'error' }, (p: { payload?: { metadata?: { error?: string } } }) => {
        setIsStreaming(false);
        isStreamingRef.current = false;
        streamBufferRef.current = '';
        const errMsg = p?.payload?.metadata?.error || 'Unknown error';
        onErrorRef.current?.(new Error(`Stream error: ${errMsg}`));
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Channel error', { noteId });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsStreaming(false);
      isStreamingRef.current = false;
      streamBufferRef.current = '';
    };
  }, [noteId, editor, enabled, defaultPosition, debug]);

  return {
    isStreaming,
    isConnected: typeof window !== 'undefined' && !!channelRef.current,
    reconnectAttempts: 0
  };
}

