"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Classeur } from "@/store/useFileSystemStore";
import "./ClasseurEditModal.css";

interface ClasseurEditModalProps {
  classeur: Classeur;
  onSave: (updates: { name: string; emoji: string; description: string }) => Promise<void>;
  onClose: () => void;
}

const EMOJI_SUGGESTIONS = [
  "📚", "📁", "🗂️", "📋", "📝", "🗃️", "💼", "🏷️", "🔖", "📌", "🎯", "⚡️", "🛠️", "🎨", "💡", "🔍", "🌟", "🪶",
  "📖", "📕", "📗", "📘", "📙", "📓", "📔", "📒", "🗒", "🗓", "📄", "📃", "📑", "🗞", "📰", "📎", "🖇", "📐", "📏",
  "✏️", "✒️", "🖊", "🖋", "🖌", "🖍", "📝", "💻", "🖥", "⌨️", "🖱", "💾", "💿", "📀", "🗃", "🗄", "🗑", "🔒", "🔓",
  "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "⛩", "🕍", "🛕", "🛖",
  "🌍", "🌎", "🌏", "🌐", "🗺", "🧭", "⛰", "🏔", "🗻", "🏕", "🏖", "🏜", "🏝", "🛤", "🛣", "🗾", "🗺", "🌋", "🏠",
  "🎯", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🪗", "🎲", "♟", "🎮",
  "🛡", "⚔️", "🔱", "🏹", "🪃", "🪄", "🔮", "💎", "📿", "🧿", "🕳", "🪬", "⚗️", "🔬", "🔭", "📡", "💉", "🩺", "🩹",
  "🧩", "🪅", "🪆", "🪢", "🪣", "🧲", "🪤", "🧪", "🧫", "🧬", "🦠", "🧫", "🩸", "💊", "🩹", "🩺", "🩼", "🦽", "🦼",
  "🪴", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺", "🍄", "🌰", "🦀", "🦞",
  "🐦", "🐧", "🐔", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🪲",
];

export default function ClasseurEditModal({ classeur, onSave, onClose }: ClasseurEditModalProps) {
  const [name, setName] = useState(classeur.name ?? "");
  const [emoji, setEmoji] = useState(classeur.emoji ?? "");
  const [description, setDescription] = useState(classeur.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSubmit();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), emoji: emoji.trim(), description: description.trim() });
      onClose();
    } catch {
      setError("Erreur lors de la sauvegarde. Réessaye.");
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="cem-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="cem-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier le classeur"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cem-header">
          <span className="cem-title">Modifier le classeur</span>
          <button className="cem-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {/* Nom */}
        <div className="cem-field">
          <label className="cem-label">Nom</label>
          <input
            ref={nameRef}
            className="cem-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du classeur"
            maxLength={255}
          />
        </div>

        {/* Description */}
        <div className="cem-field">
          <label className="cem-label">Description</label>
          <textarea
            className="cem-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optionnelle…"
            maxLength={500}
            rows={3}
          />
        </div>

        {/* Emoji picker */}
        <div className="cem-field">
          <label className="cem-label">Émoji</label>
          <div className="cem-emoji-row">
            <input
              className="cem-input cem-emoji-input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              placeholder="—"
            />
            <div className="cem-emoji-suggestions">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  className={`cem-emoji-btn${emoji === e ? " cem-emoji-btn--active" : ""}`}
                  onClick={() => setEmoji(e)}
                  type="button"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="cem-error">{error}</p>}

        {/* Footer */}
        <div className="cem-footer">
          <button className="cem-btn cem-btn--secondary" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button className="cem-btn cem-btn--primary" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
