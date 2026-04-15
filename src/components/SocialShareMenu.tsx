"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  WhatsappShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappIcon,
  TwitterIcon,
  LinkedinIcon,
} from "react-share";
import { FiLink, FiCheck } from "react-icons/fi";
import "./ExportModal.css";
import "./SocialShareModal.css";
import { simpleLogger as logger } from "@/utils/logger";

interface SocialShareMenuProps {
  url: string;
  title?: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialShareMenu({
  url,
  title = "Note Scrivia",
  description = "Découvrez cette note créée avec Scrivia",
  isOpen,
  onClose,
}: SocialShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error(
        "[SocialShareMenu] Échec copie presse-papiers",
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  const shareOptions = [
    {
      id: "copy",
      brand: "copy" as const,
      label: copied ? "Lien copié" : "Copier le lien",
      icon: copied ? <FiCheck size={20} strokeWidth={2.25} /> : <FiLink size={20} strokeWidth={2} />,
      onClick: copyToClipboard,
      type: "copy" as const,
    },
    {
      id: "whatsapp",
      brand: "whatsapp" as const,
      label: "WhatsApp",
      icon: <WhatsappIcon size={22} round />,
      component: WhatsappShareButton,
      type: "share" as const,
    },
    {
      id: "twitter",
      brand: "twitter" as const,
      label: "X (Twitter)",
      icon: <TwitterIcon size={22} round />,
      component: TwitterShareButton,
      type: "share" as const,
    },
    {
      id: "linkedin",
      brand: "linkedin" as const,
      label: "LinkedIn",
      icon: <LinkedinIcon size={22} round />,
      component: LinkedinShareButton,
      type: "share" as const,
    },
  ];

  return createPortal(
    <div
      ref={overlayRef}
      className="export-note-modal-overlay"
      data-social-share-modal
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="export-note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-share-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-note-modal__header">
          <h3 id="social-share-modal-title">Partager</h3>
          <button type="button" className="export-note-modal__close" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="export-note-modal__body">
          <p className="social-share-modal__intro">
            Copiez le lien de la page ou partagez-la sur vos réseaux.
          </p>
          <div className="social-share-modal__stack">
            {shareOptions.map((option) => {
              const rowBody = (
                <span className="social-share-modal__tile-body">
                  <span className={`social-share-modal__icon social-share-modal__icon--${option.brand}`} aria-hidden>
                    {option.icon}
                  </span>
                  <span className="social-share-modal__label">{option.label}</span>
                </span>
              );

              if (option.type === "copy") {
                return (
                  <div
                    key={option.id}
                    data-brand={option.brand}
                    className={`social-share-modal__tile social-share-modal__tile--copy ${
                      copied ? "social-share-modal__tile--success" : ""
                    }`}
                  >
                    <button type="button" className="social-share-modal__tile-control" onClick={option.onClick}>
                      {rowBody}
                    </button>
                  </div>
                );
              }

              const ShareButton = option.component;
              return (
                <div
                  key={option.id}
                  data-brand={option.brand}
                  className="social-share-modal__tile social-share-modal__tile--share"
                >
                  <ShareButton
                    url={url}
                    title={title}
                    summary={description}
                    hashtags={["scrivia", "notes"]}
                    beforeOnClick={onClose}
                  >
                    {rowBody}
                  </ShareButton>
                </div>
              );
            })}
          </div>
        </div>

        <div className="export-note-modal__footer">
          <button type="button" className="export-note-modal__btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
