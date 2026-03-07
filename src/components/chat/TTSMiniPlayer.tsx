'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Square, Play, Pause } from 'lucide-react';
import { useTextToSpeechContextOptional } from '@/contexts/TextToSpeechContext';
import './TTSMiniPlayer.css';

/**
 * Mini lecteur audio TTS affiché au-dessus du chat input quand une lecture est en cours.
 */
export default function TTSMiniPlayer() {
  const tts = useTextToSpeechContextOptional();
  const isPlaying = tts?.isPlayingMessageId != null;

  if (!tts) return null;

  return (
    <AnimatePresence>
      {isPlaying && (
      <motion.div
        className="tts-mini-player"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="tts-mini-player__inner">
          <div className="tts-mini-player__icon">
            <Volume2 size={18} />
          </div>
          <span className="tts-mini-player__label">{tts.isPaused ? 'En pause' : 'Lecture en cours'}</span>
          <div className={`tts-mini-player__wave ${tts.isPaused ? 'tts-mini-player__wave--paused' : ''}`}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <button
            type="button"
            className="tts-mini-player__btn tts-mini-player__btn--play-pause"
            onClick={tts.isPaused ? tts.resume : tts.pause}
            title={tts.isPaused ? 'Reprendre' : 'Pause'}
            aria-label={tts.isPaused ? 'Reprendre la lecture' : 'Mettre en pause'}
          >
            {tts.isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            type="button"
            className="tts-mini-player__btn tts-mini-player__btn--stop"
            onClick={tts.stop}
            title="Arrêter la lecture"
            aria-label="Arrêter la lecture"
          >
            <Square size={14} />
          </button>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
