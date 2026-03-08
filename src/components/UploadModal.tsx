"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import "./UploadModal.css";

export interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Si true, garde le modal monté pendant l'animation de sortie */
  useExitAnimation?: boolean;
  /** Appelé quand l'animation de sortie est terminée (si useExitAnimation) */
  onExitComplete?: () => void;
}

/**
 * Modale d'upload réutilisable — même style que la page Fichiers.
 * Utilisée pour : upload fichiers, insertion d'images dans l'éditeur.
 */
export default function UploadModal({
  open,
  onClose,
  title,
  children,
  useExitAnimation = false,
  onExitComplete: onExitCompleteProp,
}: UploadModalProps) {
  const [exiting, setExiting] = useState(false);
  const show = open || (useExitAnimation && exiting);

  const handleClose = useCallback(() => {
    if (useExitAnimation) {
      setExiting(true);
    }
    onClose();
  }, [onClose, useExitAnimation]);

  const handleExitComplete = useCallback(() => {
    setExiting(false);
    onExitCompleteProp?.();
  }, [onExitCompleteProp]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEsc, true);
    return () => document.removeEventListener("keydown", handleEsc, true);
  }, [open, handleClose]);

  if (!show) return null;

  return createPortal(
    <AnimatePresence onExitComplete={useExitAnimation ? handleExitComplete : undefined}>
      {open && (
        <motion.div
          key="upload-modal"
          className="uploader-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => handleClose()}
        >
          <motion.div
            className="uploader-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="uploader-modal-header">
              <h2 className="uploader-modal-title">{title}</h2>
              <button
                className="uploader-modal-close"
                onClick={() => handleClose()}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="uploader-modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
