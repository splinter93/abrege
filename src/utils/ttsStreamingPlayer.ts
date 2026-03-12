/**
 * TTS streaming player: MediaSource + SourceBuffer for MP3 chunks.
 * Queues appendBuffer calls (one at a time), supports pause/resume/stop.
 */

const MIME = 'audio/mpeg';

export interface TTSStreamingPlayerCallbacks {
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export class TTSStreamingPlayer {
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private queue: Uint8Array[] = [];
  private isAppending = false;
  private isEndOfStream = false;
  private callbacks: TTSStreamingPlayerCallbacks = {};

  /**
   * Start a new stream. Call from a user gesture for Safari.
   * Returns the Audio element to attach to the DOM if needed.
   */
  start(callbacks: TTSStreamingPlayerCallbacks = {}): HTMLAudioElement {
    this.stop();
    this.callbacks = callbacks;
    this.isEndOfStream = false;
    this.queue = [];
    this.isAppending = false;

    this.mediaSource = new MediaSource();
    this.objectUrl = URL.createObjectURL(this.mediaSource);
    this.audio = new Audio(this.objectUrl);

    this.audio.onended = () => {
      this.callbacks.onEnded?.();
    };
    this.audio.onerror = () => {
      this.callbacks.onError?.(new Error('Audio playback error'));
    };

    this.mediaSource.addEventListener('sourceopen', () => {
      try {
        this.sourceBuffer = this.mediaSource!.addSourceBuffer(MIME);
        this.sourceBuffer.mode = 'sequence';
        this.sourceBuffer.addEventListener('updateend', () => {
          this.isAppending = false;
          this.flushQueue();
        });
        this.sourceBuffer.addEventListener('error', () => {
          this.callbacks.onError?.(new Error('SourceBuffer error'));
        });
        this.flushQueue();
      } catch (e) {
        this.callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    });

    return this.audio;
  }

  /**
   * Append a chunk (base64-decoded or raw bytes). Queued until SourceBuffer is ready.
   */
  appendChunk(chunk: Uint8Array): void {
    if (this.isEndOfStream) return;
    this.queue.push(chunk);
    this.flushQueue();
  }

  /**
   * Signal no more chunks. Call after last appendChunk.
   */
  endOfStream(): void {
    this.isEndOfStream = true;
    this.flushQueue();
  }

  private flushQueue(): void {
    if (!this.sourceBuffer || this.mediaSource?.readyState !== 'open' || this.isAppending || this.queue.length === 0) {
      if (this.isEndOfStream && this.sourceBuffer && this.mediaSource?.readyState === 'open' && !this.isAppending && this.queue.length === 0) {
        try {
          this.mediaSource.endOfStream();
        } catch {
          // ignore
        }
      }
      return;
    }
    const chunk = this.queue.shift()!;
    try {
      const buffer = new Uint8Array(chunk);
      this.sourceBuffer.appendBuffer(buffer);
      this.isAppending = true;
    } catch (e) {
      this.queue.unshift(chunk);
      this.callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * Remplace les callbacks après le start() (ex: pour waitForPlayerEnd dans le pipeline).
   * N'affecte pas les callbacks audio déjà en place — seulement onEnded/onError.
   */
  setCallbacks(callbacks: TTSStreamingPlayerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    if (this.audio) {
      this.audio.onended = () => this.callbacks.onEnded?.();
      this.audio.onerror = () => this.callbacks.onError?.(new Error('Audio playback error'));
    }
  }

  getAudio(): HTMLAudioElement | null {
    return this.audio;
  }

  pause(): void {
    this.audio?.pause();
  }

  resume(): void {
    this.audio?.play().catch(() => {});
  }

  stop(): void {
    if (this.sourceBuffer && this.mediaSource?.readyState === 'open') {
      try {
        this.sourceBuffer.abort();
      } catch {
        // ignore
      }
    }
    try {
      this.mediaSource?.endOfStream();
    } catch {
      // ignore
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = '';
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.queue = [];
    this.isAppending = false;
    this.isEndOfStream = false;
  }
}
